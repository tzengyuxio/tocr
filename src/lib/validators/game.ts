import { z } from "zod";
import { optionalText } from "./fields";

export const gameCreateSchema = z.object({
  name: z.string().min(1, "遊戲名稱為必填"),
  nameOriginal: optionalText,
  nameEn: optionalText,
  // Translations that lost, and the bare name when a disambiguating suffix was
  // added -- see docs/data-conventions.md.
  aliases: z.array(z.string()).default([]),
  slug: z.string().min(1, "Slug 為必填").regex(/^[a-z0-9\u4e00-\u9fff-]+$/, "Slug 只能包含小寫字母、數字、中文和連字號"),
  releaseDate: z.coerce.date().optional().nullable(),
  platforms: z.array(z.string()).default([]),
  developer: optionalText,
  publisher: optionalText,
  genres: z.array(z.string()).default([]),
  coverImage: optionalText,
  description: optionalText,
});

// .partial() makes fields optional but keeps their defaults, so a partial
// update that omits these would silently reset them. Drop the defaults for
// updates -- see magazine.ts, which hit this first.
export const gameUpdateSchema = gameCreateSchema.partial().extend({
  platforms: z.array(z.string()).optional(),
  genres: z.array(z.string()).optional(),
  aliases: z.array(z.string()).optional(),
});

export type GameCreateInput = z.infer<typeof gameCreateSchema>;
export type GameUpdateInput = z.infer<typeof gameUpdateSchema>;

export const gameMergeSchema = z.object({
  /** The duplicate to fold in and delete. The keeper is the id in the path. */
  loserId: z.string().min(1, "缺少要合併的條目"),
  /** Ask what the merge would do without writing it, so it can be previewed. */
  dryRun: z.boolean().default(false),
});

export type GameMergeInput = z.infer<typeof gameMergeSchema>;
