import {
  DEFAULT_MAGAZINE_FILTER,
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
