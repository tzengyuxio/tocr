import sharp from "sharp";
import { resolvePolicy } from "./image-policy";

// The policy table lives in image-policy so the browser can read it without
// pulling sharp into the client bundle.
export { resolvePolicy };
export type { ImagePolicy } from "./image-policy";

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
