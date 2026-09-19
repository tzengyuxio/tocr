import {
  DEFAULT_GAME_SORT,
  DEFAULT_GAME_VIEW,
  gameBrowseHref,
  gameOrderBy,
  gamePlatformWhere,
  gameSearchWhere,
  gameYearWhere,
  parseGameDirection,
  parseGameSort,
  parseGameView,
  parsePlatforms,
  parseYearRange,
  yearRangeAfterClick,
  type GameBrowseState,
} from "@/lib/game-browse";

describe("parseGameSort / parseGameView", () => {
  it("reads a known value", () => {
    expect(parseGameSort("articles").value).toBe("articles");
    expect(parseGameView("cards")).toBe("cards");
  });

  it("falls back to the default rather than throwing on a hand-edited URL", () => {
    expect(parseGameSort("nonsense").value).toBe(DEFAULT_GAME_SORT);
    expect(parseGameView("nonsense")).toBe(DEFAULT_GAME_VIEW);
    expect(parseGameView(undefined)).toBe(DEFAULT_GAME_VIEW);
  });
});

describe("parseGameDirection", () => {
  it("uses each sort's own default when the URL says nothing", () => {
    expect(parseGameDirection(undefined, parseGameSort("name"))).toBe("asc");
    expect(parseGameDirection(undefined, parseGameSort("articles"))).toBe("desc");
  });

  it("honours an explicit direction", () => {
    expect(parseGameDirection("desc", parseGameSort("name"))).toBe("desc");
  });

  it("ignores a value that is not a direction", () => {
    expect(parseGameDirection("sideways", parseGameSort("articles"))).toBe("desc");
  });
});

describe("gameOrderBy", () => {
  it("orders by name, with the id as a tiebreaker", () => {
    expect(gameOrderBy(parseGameSort("name"), "asc")).toEqual([
      { name: "asc" },
      { id: "asc" },
    ]);
  });

  it("adds the name as a tiebreaker when ordering by article count", () => {
    // Without it the long tail of one-article games ties, and a game can show
    // up on two pages or on none.
    expect(gameOrderBy(parseGameSort("articles"), "desc")).toEqual([
      { articleGames: { _count: "desc" } },
      { name: "asc" },
      { id: "asc" },
    ]);
  });
});

describe("gameSearchWhere", () => {
  it("matches every name a game is known by", () => {
    const where = gameSearchWhere("快打");
    expect(where.OR).toEqual([
      { name: { contains: "快打", mode: "insensitive" } },
      { nameEn: { contains: "快打", mode: "insensitive" } },
      { nameOriginal: { contains: "快打", mode: "insensitive" } },
      { aliases: { has: "快打" } },
      { nameKeys: { has: "快打" } },
    ]);
  });

  // The point of keying the search too: the box and the recognition path
  // measure "same name" the same way.
  it("normalises the query the way the keys were normalised", () => {
    const where = gameSearchWhere("P.47");

    expect(where.OR).toContainEqual({ nameKeys: { has: "p47" } });
  });
});

// 站上的兩端（2026-09-20：1988–2013）。夾回範圍內是刻意的，見 parseYearRange。
const BOUNDS = { from: 1988, to: 2013 };

describe("parseYearRange", () => {
  it("reads both ends", () => {
    expect(parseYearRange("1995", "1999", BOUNDS)).toEqual({ from: 1995, to: 1999 });
  });

  it("reads one end as a single year", () => {
    expect(parseYearRange("1999", undefined, BOUNDS)).toEqual({ from: 1999, to: 1999 });
    expect(parseYearRange(undefined, "1999", BOUNDS)).toEqual({ from: 1999, to: 1999 });
  });

  it("puts a backwards range the right way round", () => {
    expect(parseYearRange("1999", "1995", BOUNDS)).toEqual({ from: 1995, to: 1999 });
  });

  // 手改網址打錯一個數字，該看到最接近的那段期間，不是整個索引。
  it("clamps to the years the data actually has", () => {
    expect(parseYearRange("1200", "3000", BOUNDS)).toEqual({ from: 1988, to: 2013 });
  });

  it("says nothing when the url says nothing, or when there is no data", () => {
    expect(parseYearRange(undefined, undefined, BOUNDS)).toBeNull();
    expect(parseYearRange("nonsense", undefined, BOUNDS)).toBeNull();
    expect(parseYearRange("1995", "1999", null)).toBeNull();
  });
});

describe("yearRangeAfterClick", () => {
  it("starts a range at the year that was clicked", () => {
    expect(yearRangeAfterClick(null, 1999)).toEqual({ from: 1999, to: 1999 });
  });

  it("extends the range in either direction", () => {
    expect(yearRangeAfterClick({ from: 1999, to: 1999 }, 1995)).toEqual({
      from: 1995,
      to: 1999,
    });
    expect(yearRangeAfterClick({ from: 1995, to: 1995 }, 1999)).toEqual({
      from: 1995,
      to: 1999,
    });
  });

  // 第三次點擊重來，否則選過一段之後就再也縮不回去。
  it("resets to a single year when the click lands inside the range", () => {
    expect(yearRangeAfterClick({ from: 1995, to: 1999 }, 1997)).toEqual({
      from: 1997,
      to: 1997,
    });
  });
});

describe("gameYearWhere", () => {
  it("keeps a game written about at any point in the range", () => {
    const where = gameYearWhere({ from: 1995, to: 1999 });
    const publishSort =
      where.articleGames?.some?.article?.issue?.publishSort as {
        gte: Date;
        lt: Date;
      };
    expect(publishSort.gte).toEqual(new Date(Date.UTC(1995, 0, 1)));
    // 上界取下一年的元旦而不是 12/31：12 月出的那一期也算在內。
    expect(publishSort.lt).toEqual(new Date(Date.UTC(2000, 0, 1)));
  });

  it("narrows nothing when no range is chosen", () => {
    expect(gameYearWhere(null)).toEqual({});
  });
});

describe("gamePlatformWhere", () => {
  // 畫面上寫 PC，底下要同時算 DOS／WIN／PC98／APPLE2。
  it("expands a family into the codes it is stored as", () => {
    const where = gamePlatformWhere(["PC"]);
    expect(where.platforms?.hasSome).toEqual(
      expect.arrayContaining(["DOS", "WIN", "PC98", "APPLE2", "PC"])
    );
  });

  it("leaves a code that is its own family alone", () => {
    expect(gamePlatformWhere(["PS3"]).platforms?.hasSome).toEqual(["PS3"]);
  });

  it("narrows nothing when nothing is picked", () => {
    expect(gamePlatformWhere([])).toEqual({});
  });
});

describe("parsePlatforms", () => {
  const known = ["PC", "PS3", "PSP"];

  it("reads a comma list, ignoring what the site has no data for", () => {
    expect(parsePlatforms("PC,PS3,SFC", known)).toEqual(["PC", "PS3"]);
  });

  it("is not case sensitive and does not repeat itself", () => {
    expect(parsePlatforms("pc, PC ,psp", known)).toEqual(["PC", "PSP"]);
  });

  it("reads an empty url as no filter", () => {
    expect(parsePlatforms(undefined, known)).toEqual([]);
  });
});

describe("gameBrowseHref", () => {
  const state: GameBrowseState = {
    query: "",
    years: null,
    platforms: [],
    sort: parseGameSort(undefined),
    direction: parseGameDirection(undefined, parseGameSort(undefined)),
    view: DEFAULT_GAME_VIEW,
  };

  // 預設值不寫進網址，/games 才會是乾淨的那一條。
  it("writes nothing for a view that is all defaults", () => {
    expect(gameBrowseHref("/games", state)).toBe("/games");
  });

  it("carries every other condition when one of them changes", () => {
    const href = gameBrowseHref(
      "/games",
      { ...state, query: "三國", platforms: ["PC"] },
      { years: { from: 1995, to: 1999 } }
    );
    expect(href).toContain("q=%E4%B8%89%E5%9C%8B");
    expect(href).toContain("platform=PC");
    expect(href).toContain("from=1995");
    expect(href).toContain("to=1999");
  });

  // 單一年份只寫一個參數，parseYearRange 讀回來仍然是那一年。
  it("writes a single year as one parameter", () => {
    const href = gameBrowseHref("/games", state, { years: { from: 1999, to: 1999 } });
    expect(href).toBe("/games?from=1999");
  });

  // 換了條件之後，第 4 頁指的已經不是同一批東西。
  it("never carries the page number", () => {
    expect(gameBrowseHref("/games", state, { view: "cards" })).toBe("/games?view=cards");
  });
});
