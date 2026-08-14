import { z } from "zod";
import { edtfSortDate, isValidEdtf } from "../edtf";
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
  magazineId: z.string().min(1, "期刊 ID 為必填"),
  issueNumber: z.string().min(1, "期號為必填"),
  volumeNumber: optionalText,
  title: optionalText,
  // EDTF (ISO 8601-2), not a calendar date: a cover may give only the month
  // or the season. See docs/data-conventions.md.
  publishDate: z
    .string()
    .min(1, "出版日期為必填")
    .refine(isValidEdtf, "日期格式無效，請使用 EDTF（例如 1999、1999-05、1999-05-20、1994-22）"),
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
  .extend({ tocImages: z.array(z.string()).optional() });

/**
 * publishSort is derived, never supplied by the caller, so that the ordering
 * key cannot drift from the EDTF value it represents. publishSort is NOT NULL,
 * hence the split: on create the date is required and the key always exists;
 * on update the field may be absent and the existing key is left alone.
 */
export function withPublishSort<T extends { publishDate: string }>(
  data: T
): T & { publishSort: Date } {
  const sort = edtfSortDate(data.publishDate);
  if (!sort) {
    // Unreachable: the schema rejects anything isValidEdtf refuses.
    throw new Error(`Cannot derive a sort key from "${data.publishDate}"`);
  }
  return { ...data, publishSort: sort };
}

export function withPublishSortIfPresent<T extends { publishDate?: string }>(
  data: T
): T & { publishSort?: Date } {
  return data.publishDate ? withPublishSort({ ...data, publishDate: data.publishDate }) : data;
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
