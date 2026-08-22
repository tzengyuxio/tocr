import { z } from "zod";
import { edtfSortDate, isValidEdtf } from "../edtf";
import { MAGAZINE_CATEGORY_VALUES } from "../magazine-browse";
import { blankToNull, optionalText } from "./fields";

// Dates are EDTF (ISO 8601-2), not calendar dates, so that "1999-05" and
// "1994-22" can say what is actually known. See lib/edtf.ts.
const optionalEdtf = z.preprocess(
  blankToNull,
  z
    .string()
    .refine(isValidEdtf, "日期格式無效，請使用 EDTF（例如 1999、1999-05、1999-05-20、1994-22）")
    .nullable()
    .optional()
);

export const magazineCreateSchema = z.object({
  name: z.string().min(1, "雜誌名稱為必填"),
  // Deliberately stricter than Game.slug and Tag.slug, which allow Chinese:
  // this one is the prefix of every issue URL, so a Chinese value would
  // percent-encode into the URLs people actually share.
  slug: z
    .string()
    .min(1, "Slug 為必填")
    .regex(/^[a-z0-9-]+$/, "Slug 只能包含小寫英文字母、數字和連字號"),
  nameOriginal: optionalText,
  aliases: z.array(z.string()).default([]),
  publisher: optionalText,
  issn: optionalText,
  description: optionalText,
  logoImage: optionalText,
  // 藏書照，純網址。刊頭是識別、這些是收藏的證據，見 docs/data-conventions.md
  photos: z.array(z.string()).default([]),
  // 報導哪一類遊戲。一本可以跨多類，見 prisma/schema.prisma 的 MagazineCategory
  categories: z.array(z.enum(MAGAZINE_CATEGORY_VALUES)).default([]),
  foundedDate: optionalEdtf,
  endedDate: optionalEdtf,
  isActive: z.boolean().default(true),
});

// .partial() makes fields optional but keeps their defaults, so a partial
// update that omits these would silently reset them -- isActive back to true,
// aliases back to empty. Drop the defaults for updates.
export const magazineUpdateSchema = magazineCreateSchema.partial().extend({
  aliases: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
  categories: z.array(z.enum(MAGAZINE_CATEGORY_VALUES)).optional(),
  isActive: z.boolean().optional(),
});

/**
 * foundedSort is derived, never supplied by the caller. Add it whenever
 * foundedDate is part of the payload so the ordering key cannot drift from the
 * EDTF value it represents.
 */
export function withFoundedSort<T extends { foundedDate?: string | null }>(
  data: T
): T & { foundedSort?: Date | null } {
  if (!("foundedDate" in data)) return data;
  return {
    ...data,
    foundedSort: data.foundedDate ? edtfSortDate(data.foundedDate) : null,
  };
}

export type MagazineCreateInput = z.infer<typeof magazineCreateSchema>;
export type MagazineUpdateInput = z.infer<typeof magazineUpdateSchema>;
