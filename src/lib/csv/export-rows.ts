import { escapeCsvField } from "./escape";

/**
 * 匯出是備份，不是「餵得回匯入」的格式。
 *
 * 兩者刻意不對稱：匯入是批次建檔的入口，只收人打得出來的欄位；匯出要能把資料庫
 * 裡的東西留下來，所以欄位只會比匯入多。也因此 volume_number 留在這裡——它還在
 * schema 裡、還有值，備份漏掉它就不是備份了，即使後台已經不再顯示這個欄位。
 *
 * 同樣的道理讓整批「只存在於後台」的欄位也在這裡：slug、封面與目錄頁圖、刊頭、
 * order。沒有它們，備份還原得回一堆資料，卻還原不回一個能用的站——網址全變成
 * cuid、圖全不見、期數排序全跑掉。issue_code 更是連結本身：分享出去的 /i/<code>
 * 網址只認它，還原後換一個就等於把所有分享過的連結弄壞。
 *
 * 衍生欄位不收（publish_sort、founded_sort、時間戳、id）——它們寫入時算得出來。
 * 刊名時期（MagazineTitle）與退役 slug（MagazineSlug）也不收：CSV 是雜誌／單期／
 * 文章三層的扁平格式，一本刊有幾筆刊名時期跟它有幾期沒有關係，塞不進同一行。
 * 兩者由 src/__tests__/lib/export-schema-coverage.test.ts 明列，schema 一加欄位
 * 那支測試就會要求在這裡補上或寫進豁免清單。
 */
export const CSV_HEADERS = [
  "magazine_name",
  "magazine_slug",
  "magazine_name_parallel",
  "magazine_source_title",
  "aliases",
  "publisher",
  "issn",
  "description",
  "categories",
  "founded_date",
  "ended_date",
  "is_active",
  "logo_image",
  "photos",
  "issue_number",
  "alt_numbers",
  "volume_number",
  "issue_slug",
  "issue_code",
  "issue_title",
  "publish_date",
  "page_count",
  "price",
  "cover_image",
  "toc_images",
  "toc_reviewed_at",
  "complete_at",
  "issue_order",
  "notes",
  "article_title",
  "article_subtitle",
  "authors",
  "category",
  "page_start",
  "page_end",
  "summary",
  "tags",
  "games",
];

const MAGAZINE_FIELD_COUNT = 14;
const ISSUE_FIELD_COUNT = 15;
const ARTICLE_FIELD_COUNT = 9;

// Prisma returns Decimal for price; anything with toString will do here.
type Numeric = number | string | { toString(): string };

export interface ExportMagazine {
  name: string;
  slug: string;
  nameParallel: string | null;
  sourceTitle: string | null;
  aliases: string[];
  publisher: string | null;
  issn: string | null;
  description: string | null;
  categories: string[];
  foundedDate: string | null;
  endedDate: string | null;
  isActive: boolean;
  logoImage: string | null;
  photos: string[];
}

export interface ExportArticle {
  title: string;
  subtitle: string | null;
  authors: string[];
  category: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  summary: string | null;
  articleTags: { tag: { name: string; type: string } }[];
  articleGames: { game: { name: string } }[];
}

export interface ExportIssue {
  issueNumber: string;
  altNumbers: string[];
  volumeNumber: string | null;
  slug: string;
  code: string;
  title: string | null;
  publishDate: string | null;
  pageCount: number | null;
  price: Numeric | null;
  coverImage: string | null;
  tocImages: string[];
  tocReviewedAt: Date | null;
  completeAt: Date | null;
  order: number;
  notes: string | null;
  articles: ExportArticle[];
}

function line(fields: string[]): string {
  return fields.map(escapeCsvField).join(",");
}

function blanks(count: number): string[] {
  return Array(count).fill("");
}

/**
 * 分號分隔，與作者、標籤、遊戲同一套寫法：逗號是欄位分隔字元，用它會逼出引號
 * 跳脫，而這些值本身就常帶逗號。
 */
function list(values: string[]): string {
  return values.join(";");
}

/** ISO 8601，UTC。EDTF 的 publish_date 是另一回事，那是原樣存的字串。 */
function timestamp(value: Date | null): string {
  return value ? value.toISOString() : "";
}

export function headerLine(): string {
  return line(CSV_HEADERS);
}

/**
 * Build the CSV lines for one magazine and a batch of its issues.
 *
 * Pure so the export can be streamed a batch at a time without holding the
 * whole database in memory. Lines come back unterminated; the caller joins
 * them, which keeps the file free of a trailing newline.
 *
 * Pass an empty `issues` array for a magazine that has none -- it still gets
 * one row, as does an issue with no articles.
 */
export function rowsFor(
  magazine: ExportMagazine,
  issues: ExportIssue[]
): string[] {
  const magFields = [
    magazine.name,
    magazine.slug,
    magazine.nameParallel ?? "",
    magazine.sourceTitle ?? "",
    list(magazine.aliases),
    magazine.publisher ?? "",
    magazine.issn ?? "",
    magazine.description ?? "",
    list(magazine.categories),
    magazine.foundedDate ?? "",
    magazine.endedDate ?? "",
    magazine.isActive ? "true" : "false",
    magazine.logoImage ?? "",
    list(magazine.photos),
  ];

  if (issues.length === 0) {
    return [line([...magFields, ...blanks(ISSUE_FIELD_COUNT + ARTICLE_FIELD_COUNT)])];
  }

  const lines: string[] = [];

  for (const issue of issues) {
    const issueFields = [
      issue.issueNumber,
      list(issue.altNumbers),
      issue.volumeNumber ?? "",
      issue.slug,
      issue.code,
      issue.title ?? "",
      issue.publishDate ?? "",
      issue.pageCount != null ? String(issue.pageCount) : "",
      issue.price != null ? String(issue.price) : "",
      issue.coverImage ?? "",
      list(issue.tocImages),
      timestamp(issue.tocReviewedAt),
      timestamp(issue.completeAt),
      String(issue.order),
      issue.notes ?? "",
    ];

    if (issue.articles.length === 0) {
      lines.push(line([...magFields, ...issueFields, ...blanks(ARTICLE_FIELD_COUNT)]));
      continue;
    }

    for (const article of issue.articles) {
      const tags = article.articleTags
        .map((at) => `${at.tag.name}[${at.tag.type}]`)
        .join(";");

      const games = article.articleGames.map((ag) => ag.game.name).join(";");

      lines.push(
        line([
          ...magFields,
          ...issueFields,
          article.title,
          article.subtitle ?? "",
          list(article.authors),
          article.category ?? "",
          article.pageStart != null ? String(article.pageStart) : "",
          article.pageEnd != null ? String(article.pageEnd) : "",
          article.summary ?? "",
          tags,
          games,
        ])
      );
    }
  }

  return lines;
}

/** The column counts the header is made of, for the tests to hold it against. */
export const FIELD_COUNTS = {
  magazine: MAGAZINE_FIELD_COUNT,
  issue: ISSUE_FIELD_COUNT,
  article: ARTICLE_FIELD_COUNT,
};
