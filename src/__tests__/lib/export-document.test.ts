import { escapeCsvField } from "@/lib/csv/escape";
import {
  CSV_HEADERS,
  headerLine,
  rowsFor,
  type ExportIssue,
  type ExportMagazine,
} from "@/lib/csv/export-rows";

/**
 * The export was rewritten to stream, and the promise made at the time was that
 * not a single byte of the output would change. This file holds the previous
 * implementation and compares whole documents against it. It is verbatim apart
 * from one marked correction -- the rewrite fixed a short row, and that fix is
 * the only intended difference in the entire output.
 *
 * When the CSV format is deliberately changed, this test is expected to fail --
 * update the baseline below in the same commit, deliberately.
 */

type Magazine = ExportMagazine & { issues: ExportIssue[] };

// --- previous implementation, copied unchanged except for its types ---------
function buildCsvTheOldWay(magazines: Magazine[]): string {
  const rows: string[][] = [];

  for (const mag of magazines) {
    const magFields: string[] = [
      mag.name,
      mag.nameOriginal ?? "",
      mag.publisher ?? "",
      mag.issn ?? "",
      mag.isActive ? "true" : "false",
    ];

    if (mag.issues.length === 0) {
      // DELIBERATE DEVIATION from the original, which had 14 blanks here.
      // 5 magazine fields + 14 blanks is 19 columns against a 20-column
      // header, so a magazine with no issues produced a short row that a
      // strict parser rejects or misaligns. The rewrite emits 15 blanks; this
      // baseline matches, so the rest of the document is still compared byte
      // for byte. See the column-count assertions in export-rows.test.ts.
      rows.push([...magFields, "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
      continue;
    }

    for (const issue of mag.issues) {
      const issueFields: string[] = [
        issue.issueNumber,
        issue.volumeNumber ?? "",
        issue.title ?? "",
        issue.publishDate,
        issue.pageCount != null ? String(issue.pageCount) : "",
        issue.price != null ? String(issue.price) : "",
      ];

      if (issue.articles.length === 0) {
        rows.push([...magFields, ...issueFields, "", "", "", "", "", "", "", "", ""]);
        continue;
      }

      for (const article of issue.articles) {
        const tags = article.articleTags
          .map((at) => `${at.tag.name}[${at.tag.type}]`)
          .join(";");

        const games = article.articleGames.map((ag) => ag.game.name).join(";");

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

  return "﻿" + csvLines.join("\r\n");
}
// ---------------------------------------------------------------------------

/** Assembles the document exactly as the streaming route does. */
function buildCsvTheNewWay(magazines: Magazine[], batchSize: number): string {
  let out = "﻿" + headerLine();

  for (const magazine of magazines) {
    if (magazine.issues.length === 0) {
      out += "\r\n" + rowsFor(magazine, []).join("\r\n");
      continue;
    }
    for (let i = 0; i < magazine.issues.length; i += batchSize) {
      const batch = magazine.issues.slice(i, i + batchSize);
      out += "\r\n" + rowsFor(magazine, batch).join("\r\n");
    }
  }

  return out;
}

function issue(n: number, articleCount: number): ExportIssue {
  return {
    issueNumber: String(n),
    volumeNumber: n % 3 === 0 ? `Vol.${n}` : null,
    title: n % 4 === 0 ? "特輯" : null,
    publishDate: `1999-${String((n % 12) + 1).padStart(2, "0")}`,
    pageCount: n % 5 === 0 ? null : 200 + n,
    price: n % 2 === 0 ? { toString: () => "180.00" } : null,
    articles: Array.from({ length: articleCount }, (_, i) => ({
      title: `文章 ${n}-${i}`,
      subtitle: i % 2 === 0 ? null : "副標，含逗號",
      authors: i % 3 === 0 ? [] : ["甲", "乙"],
      category: i % 2 === 0 ? "REVIEW" : null,
      pageStart: i,
      pageEnd: null,
      summary: i % 7 === 0 ? '含"引號"與\n換行' : null,
      articleTags: i % 2 === 0 ? [{ tag: { name: "攻略", type: "GENERAL" } }] : [],
      articleGames: i % 3 === 0 ? [{ game: { name: "太空戰士VII" } }] : [],
    })),
  };
}

const FIXTURE: Magazine[] = [
  {
    name: "電腦玩家",
    nameOriginal: null,
    publisher: "第三波",
    issn: "1021-8033",
    isActive: false,
    issues: Array.from({ length: 23 }, (_, i) => issue(i + 1, (i % 4) + 1)),
  },
  {
    // A magazine with no issues at all.
    name: "軟體世界",
    nameOriginal: "Software World",
    publisher: null,
    issn: null,
    isActive: true,
    issues: [],
  },
  {
    name: "新遊戲時代",
    nameOriginal: null,
    publisher: null,
    issn: null,
    isActive: true,
    // Includes an issue with no articles.
    issues: [issue(100, 2), issue(101, 0), issue(102, 3)],
  },
];

describe("streamed export document", () => {
  it.each([1, 2, 5, 50, 1000])(
    "is byte-identical to the previous implementation at batch size %i",
    (batchSize) => {
      expect(buildCsvTheNewWay(FIXTURE, batchSize)).toBe(
        buildCsvTheOldWay(FIXTURE)
      );
    }
  );

  it("has no trailing newline", () => {
    const out = buildCsvTheNewWay(FIXTURE, 50);
    expect(out.endsWith("\r\n")).toBe(false);
  });

  it("starts with the BOM followed by the header", () => {
    const out = buildCsvTheNewWay(FIXTURE, 50);
    expect(out.startsWith("﻿" + CSV_HEADERS.join(","))).toBe(true);
  });

  it("emits only the header when there is nothing to export", () => {
    expect(buildCsvTheNewWay([], 50)).toBe(buildCsvTheOldWay([]));
  });
});
