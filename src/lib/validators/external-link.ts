import { z } from "zod";
import { EXTERNAL_SITE_VALUES } from "../external-site";
import { optionalText } from "./fields";

const site = z.enum(EXTERNAL_SITE_VALUES);

/**
 * 站外連結。掛雜誌或掛單期，二擇一——資料庫的 external_links_one_owner 是最後
 * 一道，這裡先擋才回得了「該掛哪」。
 */
export const externalLinkCreateSchema = z
  .object({
    magazineId: optionalText,
    issueId: optionalText,
    site,
    // 只收 http(s)：這一欄會變成公開頁上可點的連結。
    url: z.string().url("網址格式無效").regex(/^https?:\/\//, "只接受 http 或 https 網址"),
    label: optionalText,
  })
  .refine((data) => !data.magazineId !== !data.issueId, {
    message: "連結要掛在雜誌或單期上，二擇一",
    path: ["magazineId"],
  })
  // OTHER 沒有預設名稱，不填就會顯示成「其他」，讀者不知道那是什麼。
  .refine((data) => data.site !== "OTHER" || Boolean(data.label?.trim()), {
    message: "站點選「其他」時要填顯示名稱",
    path: ["label"],
  });

/** 更新不動掛點：換一本刊等於換一條連結的身分，刪掉重貼說得更清楚。 */
export const externalLinkUpdateSchema = z.object({
  site: site.optional(),
  url: z.string().url("網址格式無效").regex(/^https?:\/\//, "只接受 http 或 https 網址").optional(),
  label: optionalText,
});

export const externalLinkReorderSchema = z.object({
  linkIds: z.array(z.string().min(1)),
});
