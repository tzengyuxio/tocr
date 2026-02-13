import { z } from "zod";

export const articleCreateSchema = z.object({
  issueId: z.string().min(1, "單期 ID 為必填"),
  title: z.string().min(1, "標題為必填"),
  subtitle: z.string().optional().nullable(),
  authors: z.array(z.string()).default([]),
  category: z.string().optional().nullable(),
  pageStart: z.coerce.number().int().positive().optional().nullable(),
  pageEnd: z.coerce.number().int().positive().optional().nullable(),
  summary: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
});

export const articleUpdateSchema = articleCreateSchema.partial().omit({ issueId: true });

export const articleBatchCreateSchema = z.object({
  issueId: z.string().min(1, "單期 ID 為必填"),
  articles: z.array(
    z.object({
      title: z.string().min(1, "標題為必填"),
      subtitle: z.string().optional().nullable(),
      authors: z.array(z.string()).default([]),
      category: z.string().optional().nullable(),
      pageStart: z.coerce.number().int().positive().optional().nullable(),
      pageEnd: z.coerce.number().int().positive().optional().nullable(),
      summary: z.string().optional().nullable(),
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
