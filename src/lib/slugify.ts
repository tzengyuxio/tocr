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
 * The default slug for an issue, derived from its number.
 *
 * Magazines write the same number three ways -- "163", "第163期", "VOL.51" --
 * so the number is pulled out and the decoration dropped, giving one URL shape
 * across the site. Anything else (創刊號, 70+71) goes through slugify as-is.
 *
 * This is only a *default*. An issue number is a cataloguing artefact and no
 * rule survives it: one magazine renumbered from Vol.26 back to Vol.2, so it
 * holds two different "Vol.2". Editors override the slug, and the unique
 * constraint on [magazineId, slug] makes a clash an error rather than a
 * silently suffixed "-2" nobody can tell apart. 電玩通 is overridden wholesale:
 * its slug is the cover date, which is not in issueNumber at all.
 */
export function issueSlugify(issueNumber: string): string {
  const text = issueNumber.normalize("NFKC").trim();
  const asNumber =
    text.match(/^第?\s*(\d+)\s*期?$/) ?? text.match(/^(?:vol|no)\.?\s*(\d+)$/i);
  if (asNumber) return String(Number(asNumber[1]));
  return slugify(text);
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
  // Spelled out per model: the two delegates have different generic
  // signatures, so tx[model] resolves to a union TypeScript will not call.
  const isTaken = async (slug: string) => {
    const where = { slug, ...(excludeId && { NOT: { id: excludeId } }) };
    const select = { id: true };
    const row =
      model === "game"
        ? await tx.game.findFirst({ where, select })
        : await tx.tag.findFirst({ where, select });
    return row !== null;
  };

  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    if (!(await isTaken(candidate))) return candidate;
  }
}
