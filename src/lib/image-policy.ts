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
