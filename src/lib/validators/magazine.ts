import { z } from "zod";
import { edtfSortDate, isValidEdtf } from "../edtf";

const blankToNull = (value: unknown) => (value === "" ? null : value);

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

// A blank form field must become null rather than "", so that magazines
// without an ISSN are stored as genuinely absent.
const optionalIssn = z.preprocess(
  blankToNull,
  z.string().nullable().optional()
);

export const magazineCreateSchema = z.object({
  name: z.string().min(1, "期刊名稱為必填"),
  nameOriginal: z.string().optional().nullable(),
  aliases: z.array(z.string()).default([]),
  publisher: z.string().optional().nullable(),
  issn: optionalIssn,
  description: z.string().optional().nullable(),
  logoImage: z.string().optional().nullable(),
  foundedDate: optionalEdtf,
  endedDate: optionalEdtf,
  isActive: z.boolean().default(true),
});

export const magazineUpdateSchema = magazineCreateSchema.partial();

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
