import { z } from "zod";

// An empty <input type="date"> submits "", which z.coerce.date() turns into an
// Invalid Date rather than treating the field as absent. Normalise to null.
const optionalDate = z.preprocess(
  (value) => (value === "" ? null : value),
  z.coerce.date().nullable().optional()
);

// issn is unique, so a blank form field must become null rather than "" --
// otherwise the second magazine left without an ISSN violates the constraint.
const optionalIssn = z.preprocess(
  (value) => (value === "" ? null : value),
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
  foundedDate: optionalDate,
  endedDate: optionalDate,
  isActive: z.boolean().default(true),
});

export const magazineUpdateSchema = magazineCreateSchema.partial();

export type MagazineCreateInput = z.infer<typeof magazineCreateSchema>;
export type MagazineUpdateInput = z.infer<typeof magazineUpdateSchema>;
