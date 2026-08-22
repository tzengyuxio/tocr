import { escapeCsvField } from "./escape";

/**
 * 匯出是備份，不是「餵得回匯入」的格式。
 *
 * 兩者刻意不對稱：匯入是批次建檔的入口，只收人打得出來的欄位；匯出要能把資料庫
 * 裡的東西留下來，所以欄位只會比匯入多。也因此 volume_number 留在這裡——它還在
 * schema 裡、還有值，備份漏掉它就不是備份了，即使後台已經不再顯示這個欄位。
 */
export const CSV_HEADERS = [
  "magazine_name",
  "magazine_name_parallel",
  "magazine_source_title",
  "publisher",
  "issn",
  "description",
  "founded_date",
  "is_active",
  "issue_number",
  "alt_numbers",
  "volume_number",
  "issue_title",
  "publish_date",
  "page_count",
  "price",
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

const ISSUE_FIELD_COUNT = 8;
const ARTICLE_FIELD_COUNT = 9;

// Prisma returns Decimal for price; anything with toString will do here.
type Numeric = number | string | { toString(): string };

export interface ExportMagazine {
  name: string;
  nameParallel: string | null;
  sourceTitle: string | null;
  publisher: string | null;
  issn: string | null;
  description: string | null;
  foundedDate: string | null;
  isActive: boolean;
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
  title: string | null;
  publishDate: string | null;
  pageCount: number | null;
  price: Numeric | null;
  notes: string | null;
  articles: ExportArticle[];
}

function line(fields: string[]): string {
  return fields.map(escapeCsvField).join(",");
}

function blanks(count: number): string[] {
  return Array(count).fill("");
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
    magazine.nameParallel ?? "",
    magazine.sourceTitle ?? "",
    magazine.publisher ?? "",
    magazine.issn ?? "",
    magazine.description ?? "",
    magazine.foundedDate ?? "",
    magazine.isActive ? "true" : "false",
  ];

  if (issues.length === 0) {
    return [line([...magFields, ...blanks(ISSUE_FIELD_COUNT + ARTICLE_FIELD_COUNT)])];
  }

  const lines: string[] = [];

  for (const issue of issues) {
    const issueFields = [
      issue.issueNumber,
      // 分號分隔，與作者、標籤、遊戲同一套寫法：逗號是欄位分隔字元，用它會逼出
      // 引號跳脫，而這些值本身就常帶逗號。
      issue.altNumbers.join(";"),
      issue.volumeNumber ?? "",
      issue.title ?? "",
      issue.publishDate ?? "",
      issue.pageCount != null ? String(issue.pageCount) : "",
      issue.price != null ? String(issue.price) : "",
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
          article.authors.join(";"),
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
