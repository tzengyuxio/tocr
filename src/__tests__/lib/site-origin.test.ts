import { getSiteOrigin, getTrustedOrigins } from "@/lib/site-origin";

const ENV_KEYS = [
  "NEXTAUTH_URL",
  "AUTH_URL",
  "VERCEL_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
] as const;
const original: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    original[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (original[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original[key];
    }
  }
});

describe("getSiteOrigin", () => {
  it("uses the configured URL, keeping only its origin", () => {
    process.env.NEXTAUTH_URL = "https://tocr.simagame.me/some/path";
    expect(getSiteOrigin()).toBe("https://tocr.simagame.me");
  });

  it("accepts AUTH_URL as well", () => {
    process.env.AUTH_URL = "https://tocr.simagame.me";
    expect(getSiteOrigin()).toBe("https://tocr.simagame.me");
  });

  it("falls back to the deployment host when nothing is configured", () => {
    process.env.VERCEL_URL = "tocr-preview-abc.vercel.app";
    expect(getSiteOrigin()).toBe("https://tocr-preview-abc.vercel.app");
  });

  // The per-deployment host is what Deployment Protection guards, so fetching
  // our own files through it would meet the auth wall.
  it("prefers the project domain over the deployment host", () => {
    process.env.VERCEL_URL = "tocr-abc123.vercel.app";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "tocr.simagame.me";
    expect(getSiteOrigin()).toBe("https://tocr.simagame.me");
  });

  it("falls back past a malformed configured URL", () => {
    process.env.NEXTAUTH_URL = "not-a-url";
    process.env.VERCEL_URL = "tocr.vercel.app";
    expect(getSiteOrigin()).toBe("https://tocr.vercel.app");
  });

  it("defaults to localhost for local development", () => {
    expect(getSiteOrigin()).toBe("http://localhost:3000");
  });
});

describe("getTrustedOrigins", () => {
  it("is just the site origin when nothing else is known", () => {
    expect(getTrustedOrigins()).toEqual(["http://localhost:3000"]);
  });

  // With no NEXTAUTH_URL -- which is how production runs today -- the site
  // origin is the deployment host, and the project's own domain would
  // otherwise read as somebody else's.
  it("trusts both the project domain and the deployment host", () => {
    process.env.VERCEL_URL = "tocr-abc123.vercel.app";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "tocr.simagame.me";

    expect(getTrustedOrigins()).toEqual([
      "https://tocr.simagame.me",
      "https://tocr-abc123.vercel.app",
    ]);
  });

  it("does not repeat an origin that is already the site origin", () => {
    process.env.NEXTAUTH_URL = "https://tocr.simagame.me";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "tocr.simagame.me";

    expect(getTrustedOrigins()).toEqual(["https://tocr.simagame.me"]);
  });
});
