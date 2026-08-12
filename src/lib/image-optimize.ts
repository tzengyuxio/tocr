import sharp from "sharp";

export interface ImagePolicy {
  /** Longest edge in pixels; larger images are scaled down, smaller ones left alone. */
  maxEdge: number;
  /** WebP quality. */
  quality: number;
}

/**
 * Table-of-contents scans are fed to vision OCR, so they keep more pixels and a
 * higher quality than images that only ever get displayed.
 */
const TOC_POLICY: ImagePolicy = { maxEdge: 2400, quality: 85 };
const DISPLAY_POLICY: ImagePolicy = { maxEdge: 1600, quality: 80 };

export function resolvePolicy(folder: string): ImagePolicy {
  return folder.startsWith("issues/toc") ? TOC_POLICY : DISPLAY_POLICY;
}

export interface OptimizedImage {
  data: Buffer;
  ext: string;
  contentType: string;
}

/**
 * Downscale and re-encode an upload as WebP. Animated GIFs are passed through
 * untouched -- re-encoding them is out of scope and would drop the animation.
 */
export async function optimizeImage(
  file: File,
  folder: string
): Promise<OptimizedImage> {
  const input = Buffer.from(await file.arrayBuffer());

  if (file.type === "image/gif") {
    return { data: input, ext: "gif", contentType: "image/gif" };
  }

  const { maxEdge, quality } = resolvePolicy(folder);
  const data = await sharp(input)
    .rotate()
    .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();

  return { data, ext: "webp", contentType: "image/webp" };
}
