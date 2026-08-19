import type { MetadataRoute } from "next";

/**
 * 產生 sitemap 的網址清單。
 *
 * 抽成純函式是為了測得到編碼：slug 是人工填的，中文佔多數（`創刊號`、
 * `試刊2號`），沒有百分比編碼的話 XML 裡就是一串不合法的網址，搜尋引擎會
 * 直接丟掉那一筆——而那正是這個站大部分內容所在的層。
 */

/** 逐段編碼再接起來，`/` 才不會被一起吃掉。 */
export function sitemapUrl(origin: string, segments: string[]): string {
  const path = segments.map((segment) => encodeURIComponent(segment)).join("/");
  return path ? `${origin}/${path}` : origin;
}

interface SlugRecord {
  slug: string;
  updatedAt: Date;
}

interface IssueRecord extends SlugRecord {
  magazine: { slug: string } | null;
}

export interface SitemapData {
  magazines: SlugRecord[];
  issues: IssueRecord[];
  games: SlugRecord[];
  tags: SlugRecord[];
}

/** 逐頁都有 `generateMetadata`，所以這裡只管收哪些網址，不管標題。 */
const STATIC_PATHS = [[], ["magazines"], ["games"], ["tags"], ["contributors"]];

export function buildSitemapEntries(
  origin: string,
  data: SitemapData
): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((segments) => ({
    url: sitemapUrl(origin, segments),
  }));

  for (const magazine of data.magazines) {
    entries.push({
      url: sitemapUrl(origin, ["magazines", magazine.slug]),
      lastModified: magazine.updatedAt,
    });
  }

  for (const issue of data.issues) {
    // 單期網址帶著所屬期刊，期刊查不到就組不出正規網址——與其送出
    // /magazines/undefined/... 這種必定 404 的項目，不如不收。
    if (!issue.magazine) continue;
    entries.push({
      url: sitemapUrl(origin, [
        "magazines",
        issue.magazine.slug,
        "issues",
        issue.slug,
      ]),
      lastModified: issue.updatedAt,
    });
  }

  for (const game of data.games) {
    entries.push({
      url: sitemapUrl(origin, ["games", game.slug]),
      lastModified: game.updatedAt,
    });
  }

  for (const tag of data.tags) {
    entries.push({
      url: sitemapUrl(origin, ["tags", tag.slug]),
      lastModified: tag.updatedAt,
    });
  }

  return entries;
}
