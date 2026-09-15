import { z } from "zod";
import { optionalText } from "./fields";

/**
 * 額外圖片。掛雜誌或掛單期，二擇一——資料庫的 photos_one_owner 是最後一道，
 * 這裡先擋，才回得了「該掛哪」而不是一句約束違反。
 */
export const photoCreateSchema = z
  .object({
    magazineId: optionalText,
    issueId: optionalText,
    url: z.string().min(1, "圖片網址為必填"),
    caption: optionalText,
    sourceName: optionalText,
    sourceUrl: optionalText,
    isPublic: z.boolean().default(false),
  })
  .refine((data) => !data.magazineId !== !data.issueId, {
    message: "圖片要掛在雜誌或單期上，二擇一",
    path: ["magazineId"],
  });

/**
 * 更新不動掛點：改掛別本刊等於換一張圖的身分，而現場沒有這個動作——刪掉重貼
 * 反而說得清楚。
 */
export const photoUpdateSchema = z.object({
  caption: optionalText,
  sourceName: optionalText,
  sourceUrl: optionalText,
  isPublic: z.boolean().optional(),
});

export const photoReorderSchema = z.object({
  photoIds: z.array(z.string().min(1)),
});

export type PhotoCreateInput = z.infer<typeof photoCreateSchema>;
export type PhotoUpdateInput = z.infer<typeof photoUpdateSchema>;
