/**
 * How an upload is sized and encoded. Shared by the browser, which shrinks the
 * file before sending it, and by the route, which re-encodes what arrives --
 * one table so the two cannot drift apart.
 */
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

/**
 * Vercel caps a serverless function's request body at 4.5 MB and rejects a
 * larger one at the edge, before the route -- and its own 10 MB check -- ever
 * runs. That rejection is an HTML error page, not the JSON the client expects,
 * so an oversized upload used to surface as a JSON parse error rather than as
 * anything about size. A single 4032x3024 phone photo already exceeds the cap.
 */
export const MAX_UPLOAD_BYTES = 4_500_000;

/**
 * Whether a set of images fits in one request, and what to say when it does not.
 *
 * /api/upload sends one file per request, so the per-file check is enough there.
 * /api/ocr takes every page of a table of contents in a single request, so the
 * cap applies to their sum -- three scans that are each comfortably under it
 * still add up to a body the platform rejects before the route runs.
 */
export function oversizeMessage(sizes: number[]): string | null {
  const total = sizes.reduce((sum, size) => sum + size, 0);
  if (total <= MAX_UPLOAD_BYTES) return null;

  const mb = (bytes: number) => (bytes / 1_000_000).toFixed(1);
  return `${sizes.length} 張圖縮圖後共 ${mb(total)} MB，超過單次請求上限 ${mb(
    MAX_UPLOAD_BYTES
  )} MB。請分批辨識，或先把圖片上傳到單期再用「圖片網址」辨識。`;
}
