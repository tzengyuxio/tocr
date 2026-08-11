import { z } from "zod";

// A blank number input submits "", which z.coerce.number() turns into 0 and
// .positive() then rejects. Normalise to null so the field reads as absent.
const blankToNull = (value: unknown) => (value === "" ? null : value);

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
  volumeNumber: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  publishDate: z.coerce.date({ message: "出版日期為必填" }),
  coverImage: z.string().optional().nullable(),
  tocImages: z.array(z.string()).default([]),
  pageCount: optionalInt,
  price: optionalDecimal,
  notes: z.string().optional().nullable(),
  order: z.coerce.number().int().optional(),
});

export const issueUpdateSchema = issueCreateSchema.partial().omit({ magazineId: true });

export type IssueCreateInput = z.infer<typeof issueCreateSchema>;
export type IssueUpdateInput = z.infer<typeof issueUpdateSchema>;
