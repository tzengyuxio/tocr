import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Bearer token for scripted writes (bulk imports) that have no browser session.
 * Disabled unless API_TOKEN is set, and never accepted for user management --
 * see middleware.ts.
 */

// Writes made with the token are attributed to this user so edit history shows
// which changes came from a batch import rather than a person.
export const API_USER = {
  id: "api-token",
  email: "api-token@localhost",
  name: "API Token",
  role: "ADMIN" as const,
};

// Comparing digests rather than the raw values keeps the comparison
// fixed-length, so neither the token nor its length leaks through timing.
function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function isValidApiToken(
  authorization: string | null | undefined
): boolean {
  const expected = process.env.API_TOKEN;
  if (!expected) return false;

  const prefix = "Bearer ";
  if (!authorization?.startsWith(prefix)) return false;

  const provided = authorization.slice(prefix.length).trim();
  if (!provided) return false;

  return timingSafeEqual(digest(provided), digest(expected));
}
