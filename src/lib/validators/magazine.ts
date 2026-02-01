import { z } from "zod";

export const magazineCreateSchema = z.object({
  name: z.string().min(1, "期刊名稱為必填"),
  nameEn: z.string().optional().nullable(),
  publisher: z.string().optional().nullable(),
  issn: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  foundedDate: z.coerce.date().optional().nullable(),
  endedDate: z.coerce.date().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const magazineUpdateSchema = magazineCreateSchema.partial();

export type MagazineCreateInput = z.infer<typeof magazineCreateSchema>;
export type MagazineUpdateInput = z.infer<typeof magazineUpdateSchema>;
