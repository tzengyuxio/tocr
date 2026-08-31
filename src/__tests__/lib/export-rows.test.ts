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
  slug: "acer-pc-gamer",
  nameParallel: null,
  sourceTitle: null,
  aliases: [],
  publisher: "第三波",
  issn: "1021-8033",
  description: null,
  categories: [],
  foundedDate: "1991-08",
  endedDate: null,
  isActive: false,
  logoImage: null,
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
    altNumbers: [],
    volumeNumber: null,
    slug: "105",
    code: "a1b2c3d4",
    title: null,
    publishDate: "1999-05",
    pageCount: 200,
    price: null,
    coverImage: null,
    tocImages: [],
    tocReviewedAt: null,
    completeAt: null,
    order: 105,
    notes: null,
    articles: [article()],
    ...overrides,
  };
}

const COLUMN_COUNT = CSV_HEADERS.length;

function columnsOf(line: string): number {
  // No test fixture here contains a quoted comma, so a plain split is enough.
  return line.split(",").length;
}

/** By header name, so inserting a column does not silently move an assertion. */
function field(line: string, header: string): string {
  return line.split(",")[CSV_HEADERS.indexOf(header)];
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
      issue({ volumeNumber: null, title: null, price: null, notes: null }),
    ]);

    expect(field(line, "is_active")).toBe("false");
    expect(field(line, "volume_number")).toBe("");
    expect(field(line, "issue_title")).toBe("");
    expect(field(line, "price")).toBe("");
    expect(field(line, "notes")).toBe("");
  });

  // The backup has to hold what the admin form no longer shows: volume_number
  // is off the form but still in the schema, and altNumbers is where the other
  // printed numbers now live.
  it("carries the fields the admin form does not offer", () => {
    const [line] = rowsFor(magazine, [
      issue({ altNumbers: ["HK VOL 308", "1月30日號"], volumeNumber: "第六卷第九號" }),
    ]);

    expect(field(line, "alt_numbers")).toBe("HK VOL 308;1月30日號");
    expect(field(line, "volume_number")).toBe("第六卷第九號");
    expect(field(line, "founded_date")).toBe("1991-08");
  });

  // Without these the file restores data but not a usable site: the URLs all
  // become cuids, the images are gone and the issue order is lost. issue_code
  // is the sharper case -- /i/<code> links that are already out there only
  // resolve if the same code comes back.
  it("carries the admin-only fields a restore needs", () => {
    const [line] = rowsFor(
      { ...magazine, aliases: ["ACE"], categories: ["PC"], endedDate: "2006-01", logoImage: "logo.webp" },
      [
        issue({
          slug: "1999-05",
          code: "a1b2c3d4",
          coverImage: "cover.webp",
          tocImages: ["toc1.webp", "toc2.webp"],
          tocReviewedAt: new Date("2026-08-20T04:05:06.000Z"),
          completeAt: new Date("2026-08-22T01:02:03.000Z"),
          order: 42,
        }),
      ]
    );

    expect(field(line, "magazine_slug")).toBe("acer-pc-gamer");
    expect(field(line, "aliases")).toBe("ACE");
    expect(field(line, "categories")).toBe("PC");
    expect(field(line, "ended_date")).toBe("2006-01");
    expect(field(line, "logo_image")).toBe("logo.webp");
    expect(field(line, "issue_slug")).toBe("1999-05");
    expect(field(line, "issue_code")).toBe("a1b2c3d4");
    expect(field(line, "cover_image")).toBe("cover.webp");
    expect(field(line, "toc_images")).toBe("toc1.webp;toc2.webp");
    expect(field(line, "toc_reviewed_at")).toBe("2026-08-20T04:05:06.000Z");
    expect(field(line, "complete_at")).toBe("2026-08-22T01:02:03.000Z");
    expect(field(line, "issue_order")).toBe("42");
  });

  // order is 0 for an issue nobody has placed yet, and an empty cell would read
  // as "no position" when it is a real one.
  it("writes issue_order 0 rather than an empty cell", () => {
    const [line] = rowsFor(magazine, [issue({ order: 0 })]);

    expect(field(line, "issue_order")).toBe("0");
  });

  it("leaves an unreviewed, incomplete issue's timestamps empty", () => {
    const [line] = rowsFor(magazine, [
      issue({ tocReviewedAt: null, completeAt: null }),
    ]);

    expect(field(line, "toc_reviewed_at")).toBe("");
    expect(field(line, "complete_at")).toBe("");
  });

  it("stringifies a Decimal-like price", () => {
    const [line] = rowsFor(magazine, [
      issue({ price: { toString: () => "180.00" } }),
    ]);

    expect(field(line, "price")).toBe("180.00");
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
