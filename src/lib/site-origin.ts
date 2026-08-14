/**
 * The origin this deployment answers on, taken from configuration rather than
 * from the request.
 *
 * Anything derived from the request URL is really derived from the Host header,
 * which the caller controls. Using it as a trust anchor turns "same-origin" into
 * "whatever the caller claims", so allowlists anchored on it decide nothing.
 */
export function getSiteOrigin(): string {
  const configured = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall through to the platform value rather than trusting a typo.
    }
  }

  // Set by Vercel for every deployment, preview builds included, so a preview
  // resolves its own assets instead of production's.
  const vercelHost = process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost}`;

  return "http://localhost:3000";
}

/**
 * Every origin that counts as "this site" when deciding whether a URL is our
 * own.
 *
 * getSiteOrigin answers "where do I fetch my own files from", and on Vercel
 * with nothing configured that is the deployment host (tocr-<hash>.vercel.app).
 * A URL written with the project's real domain is equally ours, so accept it
 * too rather than making the answer depend on an optional env var.
 */
export function getTrustedOrigins(): string[] {
  const origins = [getSiteOrigin()];

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (productionHost) {
    const productionOrigin = `https://${productionHost}`;
    if (!origins.includes(productionOrigin)) origins.push(productionOrigin);
  }

  return origins;
}
