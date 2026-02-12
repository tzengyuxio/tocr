/**
 * Resolve a potentially relative image URL to an absolute URL.
 * If the URL already starts with "http", return it as-is.
 * Otherwise, prepend the given origin.
 */
export function resolveImageUrl(url: string, origin: string): string {
  if (!url) return url;
  return url.startsWith("http") ? url : `${origin}${url}`;
}
