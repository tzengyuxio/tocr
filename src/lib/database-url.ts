/**
 * SSL modes that pg currently treats as `verify-full` and warns about.
 *
 * The warning is easy to read backwards: these are strong *today*, and
 * pg-connection-string v3 / pg v9 will give them standard libpq semantics,
 * which are weaker -- `require` will encrypt without verifying the server at
 * all. Naming `verify-full` outright keeps the behaviour we have once that
 * upgrade lands, and silences the warning meanwhile.
 */
const DEPRECATED_MODES = new Set(["prefer", "require", "verify-ca"]);

/**
 * Rewrite a deprecated sslmode to the behaviour it has today.
 *
 * Deliberately a no-op for anything else: `disable` and `no-verify` are
 * choices someone made, and a URL without sslmode is the local container,
 * which speaks plain TCP.
 */
export function pinSslMode(databaseUrl: string): string {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    // Not our job to validate the connection string -- let pg report it.
    return databaseUrl;
  }

  const sslmode = url.searchParams.get("sslmode");
  if (!sslmode || !DEPRECATED_MODES.has(sslmode)) return databaseUrl;

  // libpq compatibility is an explicit opt-in to the weaker semantics, so
  // leave a URL that asked for it alone.
  if (url.searchParams.get("uselibpqcompat") === "true") return databaseUrl;

  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}
