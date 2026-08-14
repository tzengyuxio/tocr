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

  // The project's own domain, preferred over the per-deployment host: that
  // host is what Vercel Deployment Protection guards, so fetching our own
  // image through it would meet the auth wall.
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (productionHost) return `https://${productionHost}`;

  const vercelHost = process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost}`;

  return "http://localhost:3000";
}

/**
 * Every origin that counts as "this site" when deciding whether a URL is our
 * own.
 *
 * getSiteOrigin answers "where do I fetch my own files from" and can only be
 * one host. A deployment is reachable on more than one -- the project domain
 * and the per-deployment URL -- and a stored image URL may name either, so
 * both count as ours.
 */
export function getTrustedOrigins(): string[] {
  const origins = [getSiteOrigin()];

  for (const host of [
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ]) {
    if (!host) continue;
    const origin = `https://${host}`;
    if (!origins.includes(origin)) origins.push(origin);
  }

  return origins;
}
