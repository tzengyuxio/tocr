import {
  ADMIN_MAGAZINE_SORTS,
  DEFAULT_MAGAZINE_FILTER,
  DEFAULT_MAGAZINE_SORT,
  magazineOrderBy,
  parseMagazineDirection,
  parseMagazineSort,
  MAGAZINE_CATEGORY_VALUES,
  MAGAZINE_FILTERS,
  parseMagazineFilter,
  DEFAULT_MAGAZINE_VIEW,
  parseMagazineView,
  magazineDisplayUnits,
  magazineSubtitle,
} from "@/lib/magazine-browse";

describe("MAGAZINE_FILTERS", () => {
  it("has one filter per category, plus 全部", () => {
    expect(MAGAZINE_FILTERS).toHaveLength(MAGAZINE_CATEGORY_VALUES.length + 1);
    expect(MAGAZINE_FILTERS[0].value).toBe("all");
  });

  it("builds a `has` clause per category and leaves 全部 unfiltered", () => {
    expect(MAGAZINE_FILTERS[0].where).toEqual({});
    const pc = MAGAZINE_FILTERS.find((f) => f.value === "pc");
    expect(pc?.where).toEqual({ categories: { has: "PC_GAME" } });
    const online = MAGAZINE_FILTERS.find((f) => f.value === "online");
    expect(online?.where).toEqual({ categories: { has: "ONLINE_GAME" } });
  });

  it("gives each filter a URL-safe value", () => {
    for (const option of MAGAZINE_FILTERS) {
      expect(option.value).toMatch(/^[a-z]+$/);
    }
  });
});

describe("parseMagazineFilter", () => {
  it("reads a known value", () => {
    expect(parseMagazineFilter("tv").value).toBe("tv");
  });

  it("falls back to the default rather than throwing on a hand-edited URL", () => {
    expect(parseMagazineFilter("nonsense").value).toBe(DEFAULT_MAGAZINE_FILTER);
    expect(parseMagazineFilter(undefined).value).toBe(DEFAULT_MAGAZINE_FILTER);
  });
});

describe("parseMagazineView", () => {
  it("reads a known value", () => {
    expect(parseMagazineView("grid")).toBe("grid");
  });

  it("falls back to the default view rather than throwing on a hand-edited URL", () => {
    expect(parseMagazineView("carousel")).toBe(DEFAULT_MAGAZINE_VIEW);
    expect(parseMagazineView(undefined)).toBe(DEFAULT_MAGAZINE_VIEW);
  });
});

describe("parseMagazineSort / parseMagazineDirection", () => {
  it("reads a known value and falls back on nonsense", () => {
    expect(parseMagazineSort("founded").value).toBe("founded");
    expect(parseMagazineSort("nonsense").value).toBe(DEFAULT_MAGAZINE_SORT);
  });

  it("uses each sort's own default direction when the URL says nothing", () => {
    expect(parseMagazineDirection(undefined, parseMagazineSort("name"))).toBe("asc");
    expect(parseMagazineDirection(undefined, parseMagazineSort("founded"))).toBe("asc");
    expect(parseMagazineDirection("desc", parseMagazineSort("founded"))).toBe("desc");
    expect(parseMagazineDirection("sideways", parseMagazineSort("name"))).toBe("asc");
  });
});

describe("magazineOrderBy", () => {
  it("orders by name alone", () => {
    expect(magazineOrderBy(parseMagazineSort("name"), "desc")).toEqual([
      { name: "desc" },
    ]);
  });

  it("orders by the derived sort key, keeps undated magazines last, and breaks ties on the name", () => {
    // foundedDate is EDTF, so "1999-05" and "1994" cannot be compared as
    // strings; foundedSort holds the start of the range each value covers.
    expect(magazineOrderBy(parseMagazineSort("founded"), "asc")).toEqual([
      { foundedSort: { sort: "asc", nulls: "last" } },
      { name: "asc" },
    ]);
  });
});

describe("the admin-only sort", () => {
  it("offers 建立日期 on top of the public two", () => {
    expect(ADMIN_MAGAZINE_SORTS.map((s) => s.value)).toEqual([
      "name",
      "founded",
      "created",
    ]);
  });

  it("is not reachable from the public list", () => {
    // A reader has no use for when a row was typed in, so ?sort=created there
    // reads as the default rather than exposing a button that page lacks.
    expect(parseMagazineSort("created").value).toBe(DEFAULT_MAGAZINE_SORT);
    expect(parseMagazineSort("created", ADMIN_MAGAZINE_SORTS).value).toBe("created");
  });

  it("orders by createdAt, newest first by default", () => {
    const sort = parseMagazineSort("created", ADMIN_MAGAZINE_SORTS);
    expect(parseMagazineDirection(undefined, sort)).toBe("desc");
    expect(magazineOrderBy(sort, "desc")).toEqual([{ createdAt: "desc" }]);
  });
});

// 改名後的時期卡要看得出它屬於哪一本刊。取**前一段**而不是刊系名：三個時期的刊物
// 顯示刊系名會讓三張卡片寫一樣的東西，看不出順序。
describe("magazineDisplayUnits 的沿革標記", () => {
  const magazine = {
    id: "m1",
    slug: "cgw",
    name: "電腦遊戲世界",
    nameParallel: null,
    sourceTitle: null,
    publisher: null,
    logoImage: null,
    categories: [],
    foundedDate: null,
    endedDate: null,
    foundedSort: null,
    knownIssueCount: null,
    knownIssueCountSource: null,
    isActive: false,
    titles: [
      { id: "t1", title: "電腦遊戲世界", startIssue: { order: 1 }, logoImage: null, titleParallel: null, titleSource: null },
      { id: "t2", title: "遊戲世界", startIssue: { order: 3 }, logoImage: null, titleParallel: null, titleSource: null },
      { id: "t3", title: "遊戲世界 2", startIssue: { order: 5 }, logoImage: null, titleParallel: null, titleSource: null },
    ],
    _count: { issues: 6 },
  };
  const issues = [1, 2, 3, 4, 5, 6].map((order) => ({ order, publishSort: null }));

  it("names the previous period, not the lineage", () => {
    const units = magazineDisplayUnits(magazine, issues);

    expect(units.map((u) => u.previousTitle)).toEqual([
      null,
      "電腦遊戲世界",
      "遊戲世界",
    ]);
  });

  // 沿革只建了後段時，首段靠 Magazine.name 代打——那一段連自己叫什麼都是推的，
  // 拿它當「原」名會讓標記出現在自己底下。
  it("stays quiet when the lineage is only half built", () => {
    const halfBuilt = {
      ...magazine,
      titles: [
        { id: "t2", title: "遊戲世界", startIssue: { order: 3 }, logoImage: null, titleParallel: null, titleSource: null },
      ],
    };

    const units = magazineDisplayUnits(halfBuilt, issues);

    expect(units.every((u) => u.previousTitle === null)).toBe(true);
  });

  // 已知總期數掛在刊系上，而改過名的刊一時期一列——把同一個數字重複三次，
  // 讀者只會以為每一段都出了那麼多期。
  it("keeps the known total off the period rows", () => {
    const units = magazineDisplayUnits(
      { ...magazine, knownIssueCount: 24, knownIssueCountSource: "國圖" },
      issues
    );

    expect(units).toHaveLength(3);
    expect(units.every((u) => u.knownIssueCount === null)).toBe(true);
  });

  it("carries the known total for a magazine that never changed its name", () => {
    const units = magazineDisplayUnits(
      { ...magazine, titles: [], knownIssueCount: 24, knownIssueCountSource: "國圖" },
      issues
    );

    expect(units[0].knownIssueCount).toBe(24);
    expect(units[0].knownIssueCountSource).toBe("國圖");
    expect(units[0].issueCount).toBe(6);
  });

  it("leaves it empty for a magazine that never changed its name", () => {
    const units = magazineDisplayUnits({ ...magazine, titles: [] }, issues);

    expect(units).toHaveLength(1);
    expect(units[0].previousTitle).toBeNull();
  });
});

// 副標的兩種來源語意不同：並列刊名是這本刊自己的另一個名字，原刊名是另一本雜誌。
// 書名號說「這是一本刊物」，「中文版」則把 sourceTitle 的欄位語意寫出來——那一欄的
// 定義本來就是「本刊整體即該外刊的中文版」。
describe("magazineSubtitle", () => {
  it("shows the parallel title bare", () => {
    expect(magazineSubtitle("Amazing Computer Entertainment", null)).toBe(
      "Amazing Computer Entertainment"
    );
  });

  it("marks a source magazine as the edition this one translates", () => {
    expect(magazineSubtitle(null, "ファミ通")).toBe("《ファミ通》中文版");
  });

  // 兩者都有的只有《勝利小子》。並列刊名在前：副標的位置讀者會讀成「這本刊的另一個
  // 名字」，把另一本雜誌放在最前面會誤導。
  it("puts the magazine's own name before the one it translates", () => {
    expect(magazineSubtitle("V. V. KIDS", "Vジャンプ")).toBe(
      "V. V. KIDS · 《Vジャンプ》中文版"
    );
  });

  // 只有一邊時不該留下孤懸的分隔符。
  it("leaves no separator when only one side is present", () => {
    expect(magazineSubtitle("GAME WALKER", null)).toBe("GAME WALKER");
    expect(magazineSubtitle(null, "電撃王")).toBe("《電撃王》中文版");
  });

  it("is empty when there is neither", () => {
    expect(magazineSubtitle(null, null)).toBe("");
  });
});

// 翻譯刊跟著原刊改名時，各時期對應的原刊不同——《電玩通PS2》的三段分別對應
// ファミ通PS2／ファミ通PS+／ファミ通PSP+PS3。先前整份副標在展開前算一次就複製給
// 每一段，於是三張卡片都寫刊系的創刊值。
describe("magazineDisplayUnits 的逐時期副標", () => {
  const famitsuPs2 = {
    id: "m2",
    slug: "famitsu-ps2-tw",
    name: "電玩通PS2",
    nameParallel: null,
    sourceTitle: "ファミ通PS2",
    publisher: null,
    logoImage: null,
    categories: [],
    foundedDate: null,
    endedDate: null,
    foundedSort: null,
    knownIssueCount: null,
    knownIssueCountSource: null,
    isActive: false,
    titles: [
      {
        id: "p1",
        title: "電玩通PS2",
        startIssue: { order: 1 },
        logoImage: null,
        titleParallel: null,
        titleSource: null,
      },
      {
        id: "p2",
        title: "電玩通PS+",
        startIssue: { order: 3 },
        logoImage: null,
        titleParallel: null,
        titleSource: "ファミ通PS+",
      },
      {
        id: "p3",
        title: "電玩通PSP+PS3",
        startIssue: { order: 5 },
        logoImage: null,
        titleParallel: null,
        titleSource: "ファミ通PSP+PS3",
      },
    ],
    _count: { issues: 6 },
  };
  const issues = [1, 2, 3, 4, 5, 6].map((order) => ({ order, publishSort: null }));

  it("gives each period the source magazine it actually translated", () => {
    const units = magazineDisplayUnits(famitsuPs2, issues);

    expect(units.map((u) => u.subtitle)).toEqual([
      "《ファミ通PS2》中文版",
      "《ファミ通PS+》中文版",
      "《ファミ通PSP+PS3》中文版",
    ]);
  });

  // 沒填的語意是「這一段沒換」，不是「這一段沒有」——首段就是靠這條拿到刊系的值。
  it("falls back to the lineage value when a period did not change", () => {
    const units = magazineDisplayUnits(
      {
        ...famitsuPs2,
        titles: famitsuPs2.titles.map((t) => ({ ...t, titleSource: null })),
      },
      issues
    );

    expect(units.every((u) => u.subtitle === "《ファミ通PS2》中文版")).toBe(true);
  });

  // 並列刊名同樣是逐段的：《電視遊樂雜誌》改名 GAME fans 時封面的拉丁刊名一起換。
  it("does the same for the parallel title", () => {
    const units = magazineDisplayUnits(
      {
        ...famitsuPs2,
        sourceTitle: null,
        nameParallel: "TV GAME MAGAZINE",
        titles: famitsuPs2.titles.map((t, i) => ({
          ...t,
          titleSource: null,
          titleParallel: i === 1 ? "GAME fans" : null,
        })),
      },
      issues
    );

    expect(units.map((u) => u.subtitle)).toEqual([
      "TV GAME MAGAZINE",
      "GAME fans",
      "TV GAME MAGAZINE",
    ]);
  });
});
