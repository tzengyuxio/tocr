import {
  CSV_HEADERS,
  headerLine,
  rowsFor,
  type ExportArticle,
  type ExportIssue,
  type ExportMagazine,
} from "@/lib/csv/export-rows";

const magazine: ExportMagazine = {
  name: "電腦玩家",
  nameOriginal: null,
  publisher: "第三波",
  issn: "1021-8033",
  isActive: false,
};

function article(overrides: Partial<ExportArticle> = {}): ExportArticle {
  return {
    title: "秘密客",
    subtitle: null,
    authors: ["甲", "乙"],
    category: "REVIEW",
    pageStart: 10,
    pageEnd: 12,
    summary: null,
    articleTags: [],
    articleGames: [],
    ...overrides,
  };
}

function issue(overrides: Partial<ExportIssue> = {}): ExportIssue {
  return {
    issueNumber: "105",
    volumeNumber: null,
    title: null,
    publishDate: "1999-05",
    pageCount: 200,
    price: null,
    articles: [article()],
    ...overrides,
  };
}

const COLUMN_COUNT = CSV_HEADERS.length;

function columnsOf(line: string): number {
  // No test fixture here contains a quoted comma, so a plain split is enough.
  return line.split(",").length;
}

describe("headerLine", () => {
  it("emits every column in order", () => {
    expect(headerLine()).toBe(CSV_HEADERS.join(","));
  });
});

describe("rowsFor", () => {
  it("emits one row per article", () => {
    const lines = rowsFor(magazine, [
      issue({ articles: [article({ title: "A" }), article({ title: "B" })] }),
    ]);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("A");
    expect(lines[1]).toContain("B");
  });

  it("still emits one row for a magazine with no issues", () => {
    const lines = rowsFor(magazine, []);
    expect(lines).toHaveLength(1);
    expect(columnsOf(lines[0])).toBe(COLUMN_COUNT);
    expect(lines[0].startsWith("電腦玩家,")).toBe(true);
  });

  it("still emits one row for an issue with no articles", () => {
    const lines = rowsFor(magazine, [issue({ articles: [] })]);
    expect(lines).toHaveLength(1);
    expect(columnsOf(lines[0])).toBe(COLUMN_COUNT);
    expect(lines[0]).toContain("105");
  });

  it("keeps every row at the full column count", () => {
    const lines = rowsFor(magazine, [
      issue(),
      issue({ articles: [] }),
      issue({ articles: [article(), article()] }),
    ]);
    expect(lines).toHaveLength(4);
    for (const line of lines) {
      expect(columnsOf(line)).toBe(COLUMN_COUNT);
    }
  });

  it("joins authors, tags and games with semicolons", () => {
    const [line] = rowsFor(magazine, [
      issue({
        articles: [
          article({
            authors: ["甲", "乙"],
            articleTags: [
              { tag: { name: "攻略", type: "GENERAL" } },
              { tag: { name: "SEGA", type: "COMPANY" } },
            ],
            articleGames: [{ game: { name: "太空戰士VII" } }],
          }),
        ],
      }),
    ]);
    expect(line).toContain("甲;乙");
    expect(line).toContain("攻略[GENERAL];SEGA[COMPANY]");
    expect(line).toContain("太空戰士VII");
  });

  it("renders null optionals as empty and false isActive as 'false'", () => {
    const [line] = rowsFor(magazine, [
      issue({ volumeNumber: null, title: null, price: null }),
    ]);
    const fields = line.split(",");
    expect(fields[4]).toBe("false"); // is_active
    expect(fields[6]).toBe(""); // volume_number
    expect(fields[7]).toBe(""); // issue_title
    expect(fields[10]).toBe(""); // price
  });

  it("stringifies a Decimal-like price", () => {
    const [line] = rowsFor(magazine, [
      issue({ price: { toString: () => "180.00" } }),
    ]);
    expect(line.split(",")[10]).toBe("180.00");
  });

  it("escapes a title that would otherwise be read as a formula", () => {
    const [line] = rowsFor(magazine, [
      issue({ articles: [article({ title: "=1+1" })] }),
    ]);
    expect(line).toContain("'=1+1");
  });
});

describe("batching", () => {
  // The route reads issues in batches and concatenates the results. Splitting
  // a magazine's issues across calls must produce exactly the same lines as
  // one call -- no row dropped, none repeated.
  it("concatenating two batches equals one whole call", () => {
    const issues = [
      issue({ issueNumber: "1" }),
      issue({ issueNumber: "2" }),
      issue({ issueNumber: "3", articles: [] }),
      issue({ issueNumber: "4" }),
    ];

    const whole = rowsFor(magazine, issues);
    const batched = [
      ...rowsFor(magazine, issues.slice(0, 2)),
      ...rowsFor(magazine, issues.slice(2)),
    ];

    expect(batched).toEqual(whole);
  });

  it("does not emit the no-issues row when a batch is non-empty", () => {
    const batched = rowsFor(magazine, [issue()]);
    expect(batched).toHaveLength(1);
    expect(batched[0]).toContain("105");
  });
});
