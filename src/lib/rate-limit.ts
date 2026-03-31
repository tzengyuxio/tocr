/**
 * Simple in-memory rate limiter using sliding window.
 * Suitable for single-instance deployments (Vercel serverless, Docker single container).
 * For multi-instance deployments, consider using Redis-based solutions (e.g. @upstash/ratelimit).
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent memory leaks
const CLEANUP_INTERVAL = 60_000; // 1 minute
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup(windowMs: number) {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
  // Allow process to exit without waiting for the timer
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  ensureCleanup(config.windowMs);

  const now = Date.now();
  const entry = store.get(key) || { timestamps: [] };

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < config.windowMs
  );

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const resetMs = oldestInWindow + config.windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      resetMs,
    };
  }

  entry.timestamps.push(now);
  store.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
    resetMs: config.windowMs,
  };
}
