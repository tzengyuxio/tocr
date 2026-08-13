import { escapeCsvField } from "./escape";

export const CSV_HEADERS = [
  "magazine_name",
  "magazine_name_original",
  "publisher",
  "issn",
  "is_active",
  "issue_number",
  "volume_number",
  "issue_title",
  "publish_date",
  "page_count",
  "price",
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

const ISSUE_FIELD_COUNT = 6;
const ARTICLE_FIELD_COUNT = 9;

// Prisma returns Decimal for price; anything with toString will do here.
type Numeric = number | string | { toString(): string };

export interface ExportMagazine {
  name: string;
  nameOriginal: string | null;
  publisher: string | null;
  issn: string | null;
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
  volumeNumber: string | null;
  title: string | null;
  publishDate: string;
  pageCount: number | null;
  price: Numeric | null;
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
    magazine.nameOriginal ?? "",
    magazine.publisher ?? "",
    magazine.issn ?? "",
    magazine.isActive ? "true" : "false",
  ];

  if (issues.length === 0) {
    return [line([...magFields, ...blanks(ISSUE_FIELD_COUNT + ARTICLE_FIELD_COUNT)])];
  }

  const lines: string[] = [];

  for (const issue of issues) {
    const issueFields = [
      issue.issueNumber,
      issue.volumeNumber ?? "",
      issue.title ?? "",
      issue.publishDate,
      issue.pageCount != null ? String(issue.pageCount) : "",
      issue.price != null ? String(issue.price) : "",
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
