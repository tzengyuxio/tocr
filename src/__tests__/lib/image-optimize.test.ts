/**
 * @jest-environment node
 */
import { optimizeImage, resolvePolicy } from "@/lib/image-optimize";
import sharp from "sharp";

describe("resolvePolicy", () => {
  it("keeps more pixels for OCR scans than for display images", () => {
    const toc = resolvePolicy("issues/toc");
    const cover = resolvePolicy("issues/covers");

    expect(toc.maxEdge).toBeGreaterThan(cover.maxEdge);
    expect(resolvePolicy("magazines")).toEqual(cover);
  });

  it("keeps OCR scans as JPEG, which the OCR backend can actually decode", () => {
    expect(resolvePolicy("issues/toc").format).toBe("jpeg");
    expect(resolvePolicy("issues/covers").format).toBe("webp");
  });
});

describe("optimizeImage", () => {
  async function pngFile(width: number, height: number, type = "image/png") {
    const buffer = await sharp({
      create: { width, height, channels: 3, background: "#888" },
    })
      .png()
      .toBuffer();
    return new File([new Uint8Array(buffer)], "scan.png", { type });
  }

  it("downscales oversized images and re-encodes them as WebP", async () => {
    const result = await optimizeImage(await pngFile(3000, 1000), "issues/covers");

    expect(result.ext).toBe("webp");
    expect(result.contentType).toBe("image/webp");
    const meta = await sharp(result.data).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(1600);
  });

  it("encodes TOC scans as JPEG", async () => {
    const result = await optimizeImage(await pngFile(3000, 1000), "issues/toc");

    expect(result.ext).toBe("jpg");
    expect(result.contentType).toBe("image/jpeg");
    const meta = await sharp(result.data).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(2400);
  });

  it("leaves images smaller than the limit at their original size", async () => {
    const result = await optimizeImage(await pngFile(400, 300), "issues/covers");

    const meta = await sharp(result.data).metadata();
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(300);
  });

  it("passes GIFs through untouched", async () => {
    const file = await pngFile(3000, 1000, "image/gif");
    const result = await optimizeImage(file, "issues/covers");

    expect(result.ext).toBe("gif");
    expect(result.data.byteLength).toBe(file.size);
  });
});
