/**
 * @jest-environment node
 */
import { Prisma } from "@prisma/client";
import { CSV_HEADERS, FIELD_COUNTS } from "@/lib/csv/export-rows";

/**
 * 匯出是備份，而備份漏欄不會有任何症狀——檔案照樣下載得下來，直到要還原的那天
 * 才發現網址、封面或排序沒了。這支測試就是那個症狀：schema 加一個欄位，這裡就
 * 會失敗，直到有人把它歸進下面三類其中一類。
 *
 * 分三類而不是兩類，是為了讓「還沒決定」留得下痕跡：豁免清單若混進待決的欄位，
 * 下次讀的人分不出哪些是想清楚不收、哪些是還沒想。
 */

/** schema 欄位 → CSV 欄名。 */
const EXPORTED: Record<string, Record<string, string>> = {
  Magazine: {
    name: "magazine_name",
    slug: "magazine_slug",
    nameParallel: "magazine_name_parallel",
    sourceTitle: "magazine_source_title",
    aliases: "aliases",
    publisher: "publisher",
    issn: "issn",
    description: "description",
    categories: "categories",
    foundedDate: "founded_date",
    endedDate: "ended_date",
    isActive: "is_active",
    logoImage: "logo_image",
    photos: "photos",
  },
  Issue: {
    issueNumber: "issue_number",
    altNumbers: "alt_numbers",
    volumeNumber: "volume_number",
    slug: "issue_slug",
    code: "issue_code",
    title: "issue_title",
    publishDate: "publish_date",
    pageCount: "page_count",
    price: "price",
    coverImage: "cover_image",
    tocImages: "toc_images",
    tocReviewedAt: "toc_reviewed_at",
    completeAt: "complete_at",
    order: "issue_order",
    notes: "notes",
  },
  Article: {
    title: "article_title",
    subtitle: "article_subtitle",
    authors: "authors",
    category: "category",
    pageStart: "page_start",
    pageEnd: "page_end",
    summary: "summary",
  },
};

/** 不收，而且想清楚了不收——寫入時算得回來，或還原後根本不該沿用。 */
const DERIVED: Record<string, string[]> = {
  Magazine: [
    "id", // cuid，還原時重新產生；認雜誌靠 slug
    "foundedSort", // foundedDate 的排序用副本，寫入時導出
    "createdAt",
    "updatedAt",
  ],
  Issue: [
    "id",
    "magazineId", // 行內的雜誌欄位就是這層關係
    "publishSort", // publishDate 的排序用副本，寫入時導出
    "completeStaleAt", // 「完備之後第一次被改動」——還原後的資料是新的，沿用沒有意義
    "createdAt",
    "updatedAt",
  ],
  Article: [
    "id",
    "issueId", // 行內的單期欄位就是這層關係
    "createdAt",
    "updatedAt",
  ],
};

/**
 * 還沒決定要不要收。列在這裡是為了不假裝已經想過。
 *
 * - Article.content：文章全文。收了備份才完整，但一篇的全文塞進一格 CSV 會讓
 *   檔案大小與可讀性都變樣，值得先想清楚格式。
 * - Article.sortOrder：一期之內的文章順序，與 Issue.order 同一個問題（頁碼排不
 *   出沒有頁碼的文章）。沒有它，還原後的目錄順序回不來。
 */
const UNDECIDED: Record<string, string[]> = {
  Magazine: [],
  Issue: [],
  Article: ["content", "sortOrder"],
};

function scalarFields(model: string): string[] {
  const found = Prisma.dmmf.datamodel.models.find((m) => m.name === model);
  if (!found) throw new Error(`model ${model} is not in the schema`);
  return found.fields.filter((f) => f.kind !== "object").map((f) => f.name);
}

describe.each(["Magazine", "Issue", "Article"])("%s in the CSV backup", (model) => {
  const fields = scalarFields(model);
  const exported = EXPORTED[model];
  const classified = [
    ...Object.keys(exported),
    ...DERIVED[model],
    ...UNDECIDED[model],
  ];

  // A new column in the schema is a hole in the backup until somebody says
  // which of the three it is.
  it("classifies every field the schema has", () => {
    expect(fields.filter((f) => !classified.includes(f))).toEqual([]);
  });

  // The other direction: a renamed or dropped field leaves a stale entry that
  // reads as a decision nobody made.
  it("classifies nothing the schema no longer has", () => {
    expect(classified.filter((f) => !fields.includes(f))).toEqual([]);
  });

  it("names only columns the header actually has", () => {
    expect(
      Object.values(exported).filter((h) => !CSV_HEADERS.includes(h))
    ).toEqual([]);
  });
});

describe("the CSV header", () => {
  it("has no duplicate column names", () => {
    expect(new Set(CSV_HEADERS).size).toBe(CSV_HEADERS.length);
  });

  // rowsFor pads with blanks counted from these, so a header that has drifted
  // from them misaligns every row of a magazine with no issues.
  it("is exactly the three blocks rowsFor writes", () => {
    expect(FIELD_COUNTS.magazine + FIELD_COUNTS.issue + FIELD_COUNTS.article).toBe(
      CSV_HEADERS.length
    );
  });
});
