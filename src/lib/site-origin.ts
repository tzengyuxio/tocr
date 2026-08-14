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
