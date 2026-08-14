import { z } from "zod";
import { optionalText } from "./fields";

export const tagCreateSchema = z.object({
  name: z.string().min(1, "標籤名稱為必填"),
  slug: z.string().min(1, "Slug 為必填").regex(/^[a-z0-9\u4e00-\u9fff-]+$/, "Slug 只能包含小寫字母、數字、中文和連字號"),
  type: z.enum(["GENERAL", "PERSON", "EVENT", "SERIES", "COMPANY", "PLATFORM"]).default("GENERAL"),
  description: optionalText,
});

// .partial() makes fields optional but keeps their defaults, so a partial
// update that omits these would silently reset them. Drop the defaults for
// updates -- see magazine.ts, which hit this first.
export const tagUpdateSchema = tagCreateSchema.partial().extend({
  type: z
    .enum(["GENERAL", "PERSON", "EVENT", "SERIES", "COMPANY", "PLATFORM"])
    .optional(),
});

export type TagCreateInput = z.infer<typeof tagCreateSchema>;
export type TagUpdateInput = z.infer<typeof tagUpdateSchema>;
