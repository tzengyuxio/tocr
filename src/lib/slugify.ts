import type { TxClient } from "./resolve-relations";

/**
 * NFKC first, so the characters that carry meaning survive the strip.
 *
 * 宇宙傳奇Ⅱ and 宇宙傳奇Ⅲ used to produce the same slug: U+2161/U+2162 sit
 * outside the allowed range and were dropped as punctuation. NFKC turns them
 * into plain "II"/"III", and folds full-width forms while it is at it.
 */
export function slugify(name: string): string {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * The first free variant of `base`: base, base-2, base-3...
 *
 * Replaces the timestamp suffix the OCR path used to append. A timestamp
 * guarantees uniqueness but leaves every slug unreadable, and the measured
 * collision rate on production is 2 in 397.
 */
export async function ensureUniqueSlug(
  tx: TxClient,
  model: "game" | "tag",
  base: string,
  excludeId?: string
): Promise<string> {
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const taken = await tx[model].findFirst({
      where: {
        slug: candidate,
        ...(excludeId && { NOT: { id: excludeId } }),
      },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
}
