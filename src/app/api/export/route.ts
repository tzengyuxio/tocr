import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function escapeCsvField(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().split("T")[0];
}

const CSV_HEADERS = [
  "magazine_name",
  "magazine_name_en",
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

export async function GET(request: NextRequest) {
  try {
    const magazineId = request.nextUrl.searchParams.get("magazineId");

    const where = magazineId ? { id: magazineId } : {};

    const magazines = await prisma.magazine.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        issues: {
          orderBy: { publishDate: "asc" },
          include: {
            articles: {
              orderBy: { sortOrder: "asc" },
              include: {
                articleTags: {
                  include: { tag: true },
                },
                articleGames: {
                  include: { game: true },
                },
              },
            },
          },
        },
      },
    });

    const rows: string[][] = [];

    for (const mag of magazines) {
      const magFields: string[] = [
        mag.name,
        mag.nameEn ?? "",
        mag.publisher ?? "",
        mag.issn ?? "",
        mag.isActive ? "true" : "false",
      ];

      if (mag.issues.length === 0) {
        // Magazine with no issues
        rows.push([...magFields, "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        continue;
      }

      for (const issue of mag.issues) {
        const issueFields: string[] = [
          issue.issueNumber,
          issue.volumeNumber ?? "",
          issue.title ?? "",
          formatDate(issue.publishDate),
          issue.pageCount != null ? String(issue.pageCount) : "",
          issue.price != null ? String(issue.price) : "",
        ];

        if (issue.articles.length === 0) {
          // Issue with no articles
          rows.push([...magFields, ...issueFields, "", "", "", "", "", "", "", "", ""]);
          continue;
        }

        for (const article of issue.articles) {
          const tags = article.articleTags
            .map((at) => `${at.tag.name}[${at.tag.type}]`)
            .join(";");

          const games = article.articleGames
            .map((ag) => ag.game.name)
            .join(";");

          const articleFields: string[] = [
            article.title,
            article.subtitle ?? "",
            article.authors.join(";"),
            article.category ?? "",
            article.pageStart != null ? String(article.pageStart) : "",
            article.pageEnd != null ? String(article.pageEnd) : "",
            article.summary ?? "",
            tags,
            games,
          ];

          rows.push([...magFields, ...issueFields, ...articleFields]);
        }
      }
    }

    const csvLines = [
      CSV_HEADERS.map(escapeCsvField).join(","),
      ...rows.map((row) => row.map(escapeCsvField).join(",")),
    ];

    const csvContent = "\uFEFF" + csvLines.join("\r\n");

    const today = new Date().toISOString().split("T")[0];
    const filename = `tocr-export-${today}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
}
