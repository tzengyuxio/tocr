import { resolvePolicy } from "./image-policy";

/** Fit width x height inside a square of maxEdge, without enlarging. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality)
  );
}

/**
 * Shrink an upload in the browser, to the same policy the route would apply.
 *
 * The route optimises what it receives, but only after the whole file has been
 * sent, and a body over MAX_UPLOAD_BYTES never reaches it. Encoding here keeps
 * every upload well under that cap and saves the wait for bytes the server was
 * going to throw away. Animated GIFs pass through untouched, as they do server
 * side -- re-encoding them would drop the animation.
 *
 * Returns the original file if the browser cannot decode or encode it; the
 * caller still checks the size, so an unshrinkable oversized file reports a
 * size error rather than failing somewhere less obvious.
 */
export async function downscaleImage(file: File, folder: string): Promise<File> {
  if (file.type === "image/gif") return file;

  const { maxEdge, quality, format } = resolvePolicy(folder);

  let bitmap: ImageBitmap;
  try {
    // Phone photos carry their rotation in EXIF; sharp applies it server side
    // via .rotate(), and drawImage would otherwise bake in the unrotated pixels.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const type = `image/${format}`;
  let blob = await toBlob(canvas, type, quality / 100);
  // toBlob silently falls back to PNG for a format the browser cannot encode
  // -- Safari before 16.4 cannot write WebP. PNG of a photo can outweigh the
  // original, so fall back to JPEG, which every browser encodes. The route
  // re-encodes to the stored format either way.
  if (!blob || blob.type !== type) {
    blob = await toBlob(canvas, "image/jpeg", quality / 100);
    if (!blob) return file;
  }

  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const name = file.name.replace(/\.[^.]*$/, "");
  return new File([blob], `${name}.${ext}`, { type: blob.type });
}
