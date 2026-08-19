import {
  ALLOWED_IMAGE_LABEL,
  ALLOWED_IMAGE_MIME_TYPES,
  DEFAULT_IMAGE_MIME_TYPE,
  isAllowedImageMimeType,
} from "@/lib/image-policy";

describe("isAllowedImageMimeType", () => {
  it("accepts every type on the list", () => {
    for (const type of ALLOWED_IMAGE_MIME_TYPES) {
      expect(isAllowedImageMimeType(type)).toBe(true);
    }
  });

  it("rejects a type that is not an image the site handles", () => {
    expect(isAllowedImageMimeType("application/pdf")).toBe(false);
    expect(isAllowedImageMimeType("image/heic")).toBe(false);
    expect(isAllowedImageMimeType("")).toBe(false);
  });

  it("rejects a bare content-type parameter rather than guessing", () => {
    // /api/ocr reads this off a remote response's Content-Type. The previous
    // inline check compared the whole header too, so this pins the behaviour
    // rather than quietly widening it.
    expect(isAllowedImageMimeType("image/jpeg; charset=binary")).toBe(false);
  });
});

describe("the allowlist and what it tells people", () => {
  it("names every allowed type in the message shown on rejection", () => {
    // The label used to be typed out next to each copy of the list; if a type
    // is added and the label is not, the error tells people the wrong thing.
    for (const type of ALLOWED_IMAGE_MIME_TYPES) {
      const name = type.replace("image/", "");
      expect(ALLOWED_IMAGE_LABEL.toLowerCase()).toContain(name);
    }
  });

  it("has a default that is itself allowed", () => {
    expect(isAllowedImageMimeType(DEFAULT_IMAGE_MIME_TYPE)).toBe(true);
  });
});
