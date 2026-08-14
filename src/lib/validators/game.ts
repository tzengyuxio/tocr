import { z } from "zod";
import { optionalText } from "./fields";

export const gameCreateSchema = z.object({
  name: z.string().min(1, "遊戲名稱為必填"),
  nameOriginal: optionalText,
  nameEn: optionalText,
  slug: z.string().min(1, "Slug 為必填").regex(/^[a-z0-9\u4e00-\u9fff-]+$/, "Slug 只能包含小寫字母、數字、中文和連字號"),
  releaseDate: z.coerce.date().optional().nullable(),
  platforms: z.array(z.string()).default([]),
  developer: optionalText,
  publisher: optionalText,
  genres: z.array(z.string()).default([]),
  coverImage: optionalText,
  description: optionalText,
});

export const gameUpdateSchema = gameCreateSchema.partial();

export type GameCreateInput = z.infer<typeof gameCreateSchema>;
export type GameUpdateInput = z.infer<typeof gameUpdateSchema>;
