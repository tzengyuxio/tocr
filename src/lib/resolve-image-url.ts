import { getSiteOrigin } from "./site-origin";

/**
 * Resolve a potentially relative image URL to an absolute URL.
 * If the URL already starts with "http", return it as-is.
 * Otherwise, prepend this deployment's own origin.
 */
export function resolveImageUrl(url: string): string {
  if (!url) return url;
  return url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `${getSiteOrigin()}${url}`;
}

/**
 * Validate that an image URL is safe for server-side fetching (SSRF protection).
 * Only allows:
 * - Same-origin URLs (relative paths resolved against the configured origin)
 * - Vercel Blob storage URLs
 * - Explicitly allowed external domains
 *
 * "Same-origin" means the origin this deployment is configured to answer on --
 * see getSiteOrigin. It used to mean the origin the request claimed, which the
 * caller sets and which therefore let any host through this branch.
 */
const ALLOWED_EXTERNAL_HOSTS = [
  // Vercel Blob storage
  /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/,
];

export function isSafeImageUrl(url: string): boolean {
  const resolved = resolveImageUrl(url);

  try {
    const parsed = new URL(resolved);

    // Allow same-origin
    if (parsed.origin === getSiteOrigin()) {
      return true;
    }

    // Only allow http/https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    // Check against allowlist
    return ALLOWED_EXTERNAL_HOSTS.some((pattern) =>
      pattern.test(parsed.hostname)
    );
  } catch {
    return false;
  }
}
