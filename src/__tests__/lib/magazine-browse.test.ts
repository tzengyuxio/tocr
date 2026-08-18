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
