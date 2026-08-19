import { sitemapUrl as canonicalUrl } from "@/lib/sitemap-entries";

/**
 * schema.org 結構化資料（JSON-LD）。
 *
 * 為什麼是這三個型別：schema.org 本來就有 `Periodical`／`PublicationIssue`／
 * `Article` 這組詞彙，講的正是「一本刊、其中一期、期裡的一篇」，用在雜誌目錄上
 * 幾乎是量身訂做。
 *
 * 這對答題引擎比對搜尋引擎更有用：沒有人會用關鍵字搜「電腦玩家 1999 年 5 月號
 * 有哪些文章」，但會這樣問模型，而全世界只有這裡有那份目錄。文章沒有自己的網址，
 * 所以掛在單期底下的 `hasPart`——那也是目錄本來的形狀。
 *
 * 網址一律走 `canonicalUrl`，與 sitemap 報出去的是同一條。兩邊不一致，等於告訴
 * 檢索端同一份內容有兩個位址。
 */

type JsonLdValue = string | number | JsonLdObject | JsonLdValue[];
export type JsonLdObject = { [key: string]: JsonLdValue | undefined };

/**
 * 拿掉沒有值的鍵。
 *
 * JSON-LD 裡的 `"description": null` 不是「沒有描述」，是「描述是 null」——空欄位
 * 寧可不出現。這個站大部分欄位都還沒填，所以這件事是常態而不是邊界情況。
 */
function compact(object: JsonLdObject): JsonLdObject {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => {
      if (value === undefined || value === null || value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    })
  );
}

/**
 * EDTF → ISO 8601，不是就回 undefined。
 *
 * `publishDate` 存的是 EDTF：`1999-05-08`、`1999-05`、`1994` 都同時是合法的
 * ISO 8601，可以直接給 `datePublished`。但季節（`1994-22` = 1994 夏）與不確定
 * 標記（`1999-05?`、`1999-05~`）是 EDTF 才有的東西，ISO 8601 讀不懂。
 *
 * 那些期數寧可不報日期，也不要拿 `publishSort` 去補一個看起來精確的日子——那是
 * 為了排序算出來的區間起點，不是出版日。
 */
function isoDate(edtf: string | null | undefined): string | undefined {
  if (!edtf) return undefined;
  const match = edtf.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
  if (!match) return undefined;
  // 21–24 是 EDTF 的四季，落在月份的位置上但不是月份。
  const month = match[2] ? Number(match[2]) : null;
  if (month !== null && (month < 1 || month > 12)) return undefined;
  return edtf;
}

export interface MagazineForJsonLd {
  name: string;
  nameEn?: string | null;
  slug: string;
  description?: string | null;
  publisher?: string | null;
  issn?: string | null;
  logoImage?: string | null;
  aliases?: string[];
  foundedDate?: string | null;
  endedDate?: string | null;
}

/**
 * 期刊本身，不帶 `@context`。
 *
 * `@context` 是整份文件的宣告，巢狀節點再寫一次只是雜訊——單期的 `isPartOf` 用的
 * 就是這一份。
 */
function periodicalNode(
  origin: string,
  magazine: MagazineForJsonLd
): JsonLdObject {
  return compact({
    "@type": "Periodical",
    name: magazine.name,
    // 舊刊名也放進來：改名之後，用舊名問的人問的仍是同一本刊。
    alternateName: [magazine.nameEn, ...(magazine.aliases ?? [])].filter(
      (name): name is string => Boolean(name)
    ),
    url: canonicalUrl(origin, ["magazines", magazine.slug]),
    description: magazine.description ?? undefined,
    issn: magazine.issn ?? undefined,
    image: magazine.logoImage ?? undefined,
    publisher: magazine.publisher
      ? { "@type": "Organization", name: magazine.publisher }
      : undefined,
    // Periodical 承自 CreativeWorkSeries，創刊與停刊就是這條系列的起訖。
    startDate: isoDate(magazine.foundedDate),
    endDate: isoDate(magazine.endedDate),
  });
}

export function periodicalJsonLd(
  origin: string,
  magazine: MagazineForJsonLd
): JsonLdObject {
  return { "@context": "https://schema.org", ...periodicalNode(origin, magazine) };
}

export interface ArticleForJsonLd {
  title: string;
  subtitle?: string | null;
  authors?: string[];
  pageStart?: number | null;
  pageEnd?: number | null;
  summary?: string | null;
}

export interface IssueForJsonLd {
  issueNumber: string;
  slug: string;
  title?: string | null;
  publishDate?: string | null;
  coverImage?: string | null;
  articles?: ArticleForJsonLd[];
}

export function publicationIssueJsonLd(
  origin: string,
  magazine: MagazineForJsonLd,
  issue: IssueForJsonLd
): JsonLdObject {
  const url = canonicalUrl(origin, [
    "magazines",
    magazine.slug,
    "issues",
    issue.slug,
  ]);

  return compact({
    "@context": "https://schema.org",
    "@type": "PublicationIssue",
    // 期號存的是封面上的字，這裡照原樣給，不補「第 N 期」——那是顯示層的事。
    issueNumber: issue.issueNumber,
    name: issue.title ?? `${magazine.name} ${issue.issueNumber}`,
    url,
    datePublished: isoDate(issue.publishDate),
    image: issue.coverImage ?? undefined,
    isPartOf: periodicalNode(origin, magazine),
    hasPart: (issue.articles ?? []).map((article) =>
      compact({
        "@type": "Article",
        headline: article.title,
        alternativeHeadline: article.subtitle ?? undefined,
        author: (article.authors ?? []).map((name) => ({
          "@type": "Person",
          name,
        })),
        description: article.summary ?? undefined,
        pageStart: article.pageStart ?? undefined,
        pageEnd: article.pageEnd ?? undefined,
        // 文章沒有自己的網址，所以指回它所在的那一期——這是它實際被讀到的位址。
        isPartOf: { "@type": "PublicationIssue", "@id": url },
      })
    ),
  });
}
