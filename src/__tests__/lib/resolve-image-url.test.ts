import { resolveImageUrl, isSafeImageUrl } from "@/lib/resolve-image-url";

// next/jest loads .env files, so a developer with any of these set locally
// would otherwise see the localhost expectations fail. Clear them per test and
// put them back afterwards, and the cases below say what they depend on.
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

describe("resolveImageUrl", () => {
  it("should return https URL as-is", () => {
    const url = "https://example.com/images/cover.jpg";
    expect(resolveImageUrl(url)).toBe(url);
  });

  it("should return http URL as-is", () => {
    const url = "http://example.com/images/cover.jpg";
    expect(resolveImageUrl(url)).toBe(url);
  });

  it("should prepend origin to relative path", () => {
    const url = "/issues/toc/xxx.jpg";
    expect(resolveImageUrl(url)).toBe("http://localhost:3000/issues/toc/xxx.jpg");
  });

  it("resolves a relative path against the configured origin", () => {
    process.env.NEXTAUTH_URL = "https://tocr.simagame.me";
    expect(resolveImageUrl("/issues/toc/xxx.jpg")).toBe(
      "https://tocr.simagame.me/issues/toc/xxx.jpg"
    );
  });

  it("should return empty string as-is", () => {
    expect(resolveImageUrl("")).toBe("");
  });
});

describe("isSafeImageUrl", () => {
  it("allows same-origin relative paths", () => {
    expect(isSafeImageUrl("/uploads/toc.jpg")).toBe(true);
    expect(isSafeImageUrl("/issues/toc/xxx.jpg")).toBe(true);
  });

  it("allows same-origin absolute URLs", () => {
    expect(isSafeImageUrl("http://localhost:3000/uploads/toc.jpg")).toBe(true);
  });

  it("allows Vercel Blob storage URLs", () => {
    expect(
      isSafeImageUrl("https://abc123.public.blob.vercel-storage.com/toc.jpg")
    ).toBe(true);
  });

  it("blocks arbitrary external URLs", () => {
    expect(isSafeImageUrl("https://evil.com/steal-data")).toBe(false);
    expect(isSafeImageUrl("https://attacker.io/internal-probe")).toBe(false);
  });

  it("blocks non-http protocols", () => {
    expect(isSafeImageUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeImageUrl("ftp://internal-server/data")).toBe(false);
  });

  it("blocks internal network addresses disguised as URLs", () => {
    expect(isSafeImageUrl("http://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(isSafeImageUrl("http://192.168.1.1/admin")).toBe(false);
    expect(isSafeImageUrl("http://10.0.0.1/secret")).toBe(false);
  });

  it("returns false for malformed URLs", () => {
    expect(isSafeImageUrl("not-a-url")).toBe(false);
  });

  it("accepts both the production domain and the deployment host", () => {
    process.env.VERCEL_URL = "tocr-abc123.vercel.app";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "tocr.simagame.me";

    expect(isSafeImageUrl("https://tocr.simagame.me/issues/toc/a.jpg")).toBe(true);
    expect(isSafeImageUrl("https://tocr-abc123.vercel.app/issues/toc/a.jpg")).toBe(
      true
    );
    expect(isSafeImageUrl("https://evil.com/steal-data")).toBe(false);
  });

  // The point of the change: the anchor is the configured origin, so a host the
  // request claims -- previously the whole basis of the same-origin branch --
  // buys nothing.
  it("judges same-origin against the configured origin, not the request", () => {
    process.env.NEXTAUTH_URL = "https://tocr.simagame.me";

    expect(isSafeImageUrl("https://tocr.simagame.me/issues/toc/a.jpg")).toBe(true);
    expect(isSafeImageUrl("http://localhost:3000/uploads/toc.jpg")).toBe(false);
    expect(isSafeImageUrl("http://169.254.169.254/latest/meta-data/")).toBe(false);
  });
});
