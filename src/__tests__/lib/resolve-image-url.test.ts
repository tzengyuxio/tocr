import { resolveImageUrl, isSafeImageUrl } from "@/lib/resolve-image-url";

describe("resolveImageUrl", () => {
  const origin = "http://localhost:3000";

  it("should return https URL as-is", () => {
    const url = "https://example.com/images/cover.jpg";
    expect(resolveImageUrl(url, origin)).toBe(url);
  });

  it("should return http URL as-is", () => {
    const url = "http://example.com/images/cover.jpg";
    expect(resolveImageUrl(url, origin)).toBe(url);
  });

  it("should prepend origin to relative path", () => {
    const url = "/issues/toc/xxx.jpg";
    expect(resolveImageUrl(url, origin)).toBe("http://localhost:3000/issues/toc/xxx.jpg");
  });

  it("should return empty string as-is", () => {
    expect(resolveImageUrl("", origin)).toBe("");
  });
});

describe("isSafeImageUrl", () => {
  const origin = "http://localhost:3000";

  it("allows same-origin relative paths", () => {
    expect(isSafeImageUrl("/uploads/toc.jpg", origin)).toBe(true);
    expect(isSafeImageUrl("/issues/toc/xxx.jpg", origin)).toBe(true);
  });

  it("allows same-origin absolute URLs", () => {
    expect(isSafeImageUrl("http://localhost:3000/uploads/toc.jpg", origin)).toBe(true);
  });

  it("allows Vercel Blob storage URLs", () => {
    expect(
      isSafeImageUrl("https://abc123.public.blob.vercel-storage.com/toc.jpg", origin)
    ).toBe(true);
  });

  it("blocks arbitrary external URLs", () => {
    expect(isSafeImageUrl("https://evil.com/steal-data", origin)).toBe(false);
    expect(isSafeImageUrl("https://attacker.io/internal-probe", origin)).toBe(false);
  });

  it("blocks non-http protocols", () => {
    expect(isSafeImageUrl("file:///etc/passwd", origin)).toBe(false);
    expect(isSafeImageUrl("ftp://internal-server/data", origin)).toBe(false);
  });

  it("blocks internal network addresses disguised as URLs", () => {
    expect(isSafeImageUrl("http://169.254.169.254/latest/meta-data/", origin)).toBe(false);
    expect(isSafeImageUrl("http://192.168.1.1/admin", origin)).toBe(false);
    expect(isSafeImageUrl("http://10.0.0.1/secret", origin)).toBe(false);
  });

  it("returns false for malformed URLs", () => {
    expect(isSafeImageUrl("not-a-url", origin)).toBe(false);
  });
});
