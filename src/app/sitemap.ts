import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteOrigin } from "@/lib/site-origin";
import { buildSitemapEntries } from "@/lib/sitemap-entries";

/**
 * 動態產生 sitemap。
 *
 * 手寫不可能：955 期加上近 400 款遊戲，而且每次匯入都會變。這個站大部分內容
 * 藏在 `/magazines/<刊>/issues/<期>`，要點兩層才到，光靠爬連結摸索不夠。
 *
 * `/i/<code>` 短碼不收：那是給「已經分享出去、之後不能壞」的場合用的轉址，
 * 正規網址才是該被索引的那條。收了等於同一份內容報兩個網址。
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const select = { slug: true, updatedAt: true };
  const [magazines, issues, games, tags] = await Promise.all([
    prisma.magazine.findMany({ select }),
    prisma.issue.findMany({
      select: { ...select, magazine: { select: { slug: true } } },
    }),
    prisma.game.findMany({ select }),
    prisma.tag.findMany({ select }),
  ]);

  return buildSitemapEntries(getSiteOrigin(), { magazines, issues, games, tags });
}
