import sharp from "sharp";

export interface ImagePolicy {
  /** Longest edge in pixels; larger images are scaled down, smaller ones left alone. */
  maxEdge: number;
  /** Encoder quality. */
  quality: number;
  format: "webp" | "jpeg";
}

/**
 * Table-of-contents scans are fed to vision OCR, so they keep more pixels and a
 * higher quality than images that only ever get displayed.
 *
 * They also stay JPEG: the self-hosted OCR backend cannot decode WebP and fails
 * the whole page with "Failed to load image or audio file". WebP would save
 * roughly a further 20% here, which is not worth an unusable scan.
 */
const TOC_POLICY: ImagePolicy = { maxEdge: 2400, quality: 85, format: "jpeg" };
const DISPLAY_POLICY: ImagePolicy = { maxEdge: 1600, quality: 80, format: "webp" };

export function resolvePolicy(folder: string): ImagePolicy {
  return folder.startsWith("issues/toc") ? TOC_POLICY : DISPLAY_POLICY;
}

export interface OptimizedImage {
  data: Buffer;
  ext: string;
  contentType: string;
}

/**
 * Downscale and re-encode an upload in the format its policy calls for.
 * Animated GIFs are passed through untouched -- re-encoding them is out of
 * scope and would drop the animation.
 */
export async function optimizeImage(
  file: File,
  folder: string
): Promise<OptimizedImage> {
  const input = Buffer.from(await file.arrayBuffer());

  if (file.type === "image/gif") {
    return { data: input, ext: "gif", contentType: "image/gif" };
  }

  const { maxEdge, quality, format } = resolvePolicy(folder);
  const resized = sharp(input)
    .rotate()
    .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true });

  const data = await (format === "jpeg"
    ? resized.jpeg({ quality })
    : resized.webp({ quality })
  ).toBuffer();

  return {
    data,
    ext: format === "jpeg" ? "jpg" : "webp",
    contentType: `image/${format}`,
  };
}
