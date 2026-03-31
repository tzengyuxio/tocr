/**
 * Resolve a potentially relative image URL to an absolute URL.
 * If the URL already starts with "http", return it as-is.
 * Otherwise, prepend the given origin.
 */
export function resolveImageUrl(url: string, origin: string): string {
  if (!url) return url;
  return url.startsWith("http") ? url : `${origin}${url}`;
}

/**
 * Validate that an image URL is safe for server-side fetching (SSRF protection).
 * Only allows:
 * - Same-origin URLs (relative paths resolved against origin)
 * - Vercel Blob storage URLs
 * - Explicitly allowed external domains
 */
const ALLOWED_EXTERNAL_HOSTS = [
  // Vercel Blob storage
  /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/,
];

export function isSafeImageUrl(url: string, origin: string): boolean {
  const resolved = resolveImageUrl(url, origin);

  try {
    const parsed = new URL(resolved);
    const originParsed = new URL(origin);

    // Allow same-origin
    if (parsed.origin === originParsed.origin) {
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
