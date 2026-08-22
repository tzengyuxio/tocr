import { escapeCsvField } from "@/lib/csv/escape";
import {
  CSV_HEADERS,
  headerLine,
  rowsFor,
  type ExportIssue,
  type ExportMagazine,
} from "@/lib/csv/export-rows";

/**
 * A whole-document check: a second, independent assembly of the same CSV, so a
 * change to rowsFor that only looks right in a one-row fixture shows up here
 * against 26 issues, batch boundaries, quoting and empty magazines.
 *
 * It began as the pre-streaming implementation, kept verbatim to prove the
 * rewrite changed not one byte. The format has deliberately changed twice
 * since -- a short row was fixed, and 2026-08-20 added the backup columns --
 * so the baseline is now maintained alongside rowsFor rather than frozen.
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
      mag.nameParallel ?? "",
      mag.sourceTitle ?? "",
      mag.publisher ?? "",
      mag.issn ?? "",
      mag.description ?? "",
      mag.foundedDate ?? "",
      mag.isActive ? "true" : "false",
    ];

    if (mag.issues.length === 0) {
      // 7 magazine fields + 17 blanks against a 24-column header. The
      // original emitted a short row here, which a strict parser rejects or
      // misaligns; see the column-count assertions in export-rows.test.ts.
      rows.push([...magFields, ...Array(17).fill("")]);
      continue;
    }

    for (const issue of mag.issues) {
      const issueFields: string[] = [
        issue.issueNumber,
        issue.altNumbers.join(";"),
        issue.volumeNumber ?? "",
        issue.title ?? "",
        issue.publishDate ?? "",
        issue.pageCount != null ? String(issue.pageCount) : "",
        issue.price != null ? String(issue.price) : "",
        issue.notes ?? "",
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
    altNumbers: n % 5 === 0 ? [`HK VOL ${n}`, `${n} 月號`] : [],
    volumeNumber: n % 3 === 0 ? `Vol.${n}` : null,
    title: n % 4 === 0 ? "特輯" : null,
    publishDate: `1999-${String((n % 12) + 1).padStart(2, "0")}`,
    pageCount: n % 5 === 0 ? null : 200 + n,
    price: n % 2 === 0 ? { toString: () => "180.00" } : null,
    notes: n % 6 === 0 ? "附贈海報，含逗號" : null,
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
    nameParallel: null,
    sourceTitle: null,
    publisher: "第三波",
    issn: "1021-8033",
    description: "含,逗號的描述",
    foundedDate: "1991-08",
    isActive: false,
    issues: Array.from({ length: 23 }, (_, i) => issue(i + 1, (i % 4) + 1)),
  },
  {
    // A magazine with no issues at all.
    name: "軟體世界",
    nameParallel: "Software World",
    sourceTitle: null,
    publisher: null,
    issn: null,
    description: null,
    foundedDate: null,
    isActive: true,
    issues: [],
  },
  {
    name: "新遊戲時代",
    nameParallel: null,
    sourceTitle: null,
    publisher: null,
    issn: null,
    description: null,
    foundedDate: "1998",
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
