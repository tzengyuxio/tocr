import { z } from "zod";
import { edtfSortDate, isValidEdtf } from "../edtf";
import { issueSlugify } from "../slugify";
import { blankToNull, optionalText } from "./fields";

// A blank number input submits "", which z.coerce.number() turns into 0 and
// .positive() then rejects. blankToNull makes the field read as absent.

const optionalInt = z.preprocess(
  blankToNull,
  z.coerce.number().int().positive().nullable().optional()
);

const optionalDecimal = z.preprocess(
  blankToNull,
  z.coerce.number().positive().nullable().optional()
);

export const issueCreateSchema = z.object({
  magazineId: z.string().min(1, "雜誌 ID 為必填"),
  issueNumber: z.string().min(1, "期號為必填"),
  // Optional on the wire: left blank, the server derives it from the issue
  // number. Same charset as Game.slug -- 創刊號 has to survive.
  slug: z.preprocess(
    blankToNull,
    z
      .string()
      .regex(/^[a-z0-9一-鿿-]+$/, "網址代號只能包含小寫字母、數字、中文和連字號")
      .nullable()
      .optional()
  ),
  // The other numbers printed on the same issue -- see Issue.altNumbers.
  altNumbers: z.array(z.string()).default([]),
  volumeNumber: optionalText,
  title: optionalText,
  // EDTF (ISO 8601-2), not a calendar date: a cover may give only the month
  // or the season. Optional, because some issues state no date at all and
  // their place in the run is held by `order`. See docs/data-conventions.md.
  publishDate: z.preprocess(
    blankToNull,
    z
      .string()
      .refine(isValidEdtf, "日期格式無效，請使用 EDTF（例如 1999、1999-05、1999-05-20、1994-22）")
      .nullable()
      .optional()
  ),
  coverImage: optionalText,
  tocImages: z.array(z.string()).default([]),
  pageCount: optionalInt,
  price: optionalDecimal,
  notes: optionalText,
  order: z.coerce.number().int().optional(),
  // A flag rather than the stored timestamp: the caller states that a person
  // checked the table of contents, the server decides when that happened.
  tocReviewed: z.boolean().optional(),
});

// .partial() makes fields optional but keeps their defaults, so a partial
// update that omits tocImages would silently wipe the scans already attached.
export const issueUpdateSchema = issueCreateSchema
  .partial()
  .omit({ magazineId: true })
  .extend({
    tocImages: z.array(z.string()).optional(),
    altNumbers: z.array(z.string()).optional(),
  });

/**
 * publishSort is derived, never supplied by the caller, so that the ordering
 * key cannot drift from the EDTF value it represents. Both columns are
 * nullable and they are null together: an issue with no stated date has no
 * position on a timeline either, and cross-magazine lists sort it last.
 */
export function withPublishSort<T extends { publishDate?: string | null }>(
  data: T
): T & { publishSort: Date | null } {
  if (!data.publishDate) return { ...data, publishSort: null };
  const sort = edtfSortDate(data.publishDate);
  if (!sort) {
    // Unreachable: the schema rejects anything isValidEdtf refuses.
    throw new Error(`Cannot derive a sort key from "${data.publishDate}"`);
  }
  return { ...data, publishSort: sort };
}

/**
 * Fill in the slug on create when the caller left it blank.
 *
 * Derived from the issue number, which covers the plain "163"/"第163期"/"VOL.51"
 * majority. Anything the rule cannot name well -- 電玩通, whose slug is the
 * cover date and is not in issueNumber at all -- the editor types in.
 */
export function withIssueSlug<T extends { issueNumber: string; slug?: string | null }>(
  data: T
): Omit<T, "slug"> & { slug: string } {
  const { slug, ...rest } = data;
  return { ...rest, slug: slug || issueSlugify(data.issueNumber) };
}

/**
 * On update a blank slug means "leave it alone", never "recompute it".
 *
 * Renaming an issue number to fix a typo must not silently move the URL --
 * the slug is what the outside world has already linked to.
 */
export function withIssueSlugIfPresent<T extends { slug?: string | null }>(
  data: T
): Omit<T, "slug"> & { slug?: string } {
  const { slug, ...rest } = data;
  return slug ? { ...rest, slug } : rest;
}

/**
 * On update the field may be absent, and absent means "leave it alone".
 *
 * Present-but-empty is a different instruction: the editor cleared the date
 * (blankToNull has already turned "" into null), so both columns are cleared
 * together. Only `undefined` counts as absent -- testing truthiness instead
 * would leave a sort key behind for a date that no longer exists.
 */
export function withPublishSortIfPresent<T extends { publishDate?: string | null }>(
  data: T
): T & { publishSort?: Date | null } {
  return data.publishDate !== undefined ? withPublishSort(data) : data;
}

/**
 * Turn the caller's `tocReviewed` flag into the stored timestamp.
 *
 * Only a human session may set it -- scripted writes go through the API token
 * and have not read the scans, so their flag is dropped rather than trusted.
 *
 * The timestamp only moves on a transition. Re-saving an already-reviewed
 * issue to fix an unrelated field would otherwise reset the date to today and
 * lose when the review actually happened.
 */
export function withTocReviewedAt<T extends { tocReviewed?: boolean }>(
  data: T,
  { isHuman, current }: { isHuman: boolean; current: Date | null }
): Omit<T, "tocReviewed"> & { tocReviewedAt?: Date | null } {
  const { tocReviewed, ...rest } = data;
  if (tocReviewed === undefined || !isHuman) {
    return rest;
  }
  if (tocReviewed) {
    return current ? rest : { ...rest, tocReviewedAt: new Date() };
  }
  return current ? { ...rest, tocReviewedAt: null } : rest;
}

export type IssueCreateInput = z.infer<typeof issueCreateSchema>;
export type IssueUpdateInput = z.infer<typeof issueUpdateSchema>;
