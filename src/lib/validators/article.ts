import { z } from "zod";
import { ARTICLE_CATEGORY_VALUES } from "@/lib/article-categories";
import { optionalText } from "./fields";

export const articleCreateSchema = z.object({
  issueId: z.string().min(1, "單期 ID 為必填"),
  title: z.string().min(1, "標題為必填"),
  subtitle: optionalText,
  authors: z.array(z.string()).default([]),
  category: z.enum(ARTICLE_CATEGORY_VALUES).optional().nullable(),
  pageStart: z.coerce.number().int().positive().optional().nullable(),
  pageEnd: z.coerce.number().int().positive().optional().nullable(),
  summary: optionalText,
  content: optionalText,
  sortOrder: z.coerce.number().int().default(0),
});

// .partial() makes fields optional but keeps their defaults, so a partial
// update that omits these would silently reset them. Drop the defaults for
// updates -- see magazine.ts, which hit this first.
export const articleUpdateSchema = articleCreateSchema
  .partial()
  .omit({ issueId: true })
  .extend({
    authors: z.array(z.string()).optional(),
    sortOrder: z.coerce.number().int().optional(),
  });

export const articleBatchCreateSchema = z.object({
  issueId: z.string().min(1, "單期 ID 為必填"),
  // 重跑辨識時，取代整期的文章。不帶就是單純附加（匯入腳本靠這個行為）。
  replaceExisting: z.boolean().optional(),
  articles: z.array(
    z.object({
      title: z.string().min(1, "標題為必填"),
      subtitle: optionalText,
      authors: z.array(z.string()).default([]),
      category: z.enum(ARTICLE_CATEGORY_VALUES).optional().nullable(),
      pageStart: z.coerce.number().int().positive().optional().nullable(),
      pageEnd: z.coerce.number().int().positive().optional().nullable(),
      summary: optionalText,
      sortOrder: z.coerce.number().int().default(0),
      suggestedGames: z.array(z.string()).optional(),
      suggestedTags: z.array(
        z.union([z.string(), z.object({ name: z.string(), type: z.string() })])
      ).optional(),
    })
  ),
});

export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;
export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>;
export type ArticleBatchCreateInput = z.infer<typeof articleBatchCreateSchema>;
