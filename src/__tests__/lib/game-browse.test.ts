import {
  DEFAULT_GAME_FILTER,
  DEFAULT_GAME_SORT,
  gameOrderBy,
  gameSearchWhere,
  parseGameDirection,
  parseGameFilter,
  parseGameSort,
} from "@/lib/game-browse";

describe("parseGameFilter / parseGameSort", () => {
  it("reads a known value", () => {
    expect(parseGameFilter("reported").value).toBe("reported");
    expect(parseGameSort("articles").value).toBe("articles");
  });

  it("falls back to the default rather than throwing on a hand-edited URL", () => {
    expect(parseGameFilter("nonsense").value).toBe(DEFAULT_GAME_FILTER);
    expect(parseGameSort("nonsense").value).toBe(DEFAULT_GAME_SORT);
    expect(parseGameFilter(undefined).value).toBe(DEFAULT_GAME_FILTER);
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
  it("orders by name alone", () => {
    expect(gameOrderBy(parseGameSort("name"), "asc")).toEqual([{ name: "asc" }]);
  });

  it("adds the name as a tiebreaker when ordering by article count", () => {
    // Without it the long tail of one-article games ties, and a game can show
    // up on two pages or on none.
    expect(gameOrderBy(parseGameSort("articles"), "desc")).toEqual([
      { articleGames: { _count: "desc" } },
      { name: "asc" },
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
