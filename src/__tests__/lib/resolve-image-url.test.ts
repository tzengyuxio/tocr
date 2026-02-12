import { resolveImageUrl } from "@/lib/resolve-image-url";

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
