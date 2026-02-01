import { z } from "zod";

export const issueCreateSchema = z.object({
  magazineId: z.string().min(1, "期刊 ID 為必填"),
  issueNumber: z.string().min(1, "期號為必填"),
  volumeNumber: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  publishDate: z.coerce.date({ required_error: "出版日期為必填" }),
  coverImage: z.string().optional().nullable(),
  tocImage: z.string().optional().nullable(),
  pageCount: z.coerce.number().int().positive().optional().nullable(),
  price: z.coerce.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const issueUpdateSchema = issueCreateSchema.partial().omit({ magazineId: true });

export type IssueCreateInput = z.infer<typeof issueCreateSchema>;
export type IssueUpdateInput = z.infer<typeof issueUpdateSchema>;
