import {
  articleOrderBy,
  nextDirection,
  parseArticleDirection,
  parseArticleSort,
} from "@/lib/article-listing";

describe("parseArticleSort", () => {
  it("reads a known value", () => {
    expect(parseArticleSort("issue").value).toBe("issue");
  });

  it("falls back to the default rather than failing", () => {
    expect(parseArticleSort("nonsense").value).toBe("date");
    expect(parseArticleSort(undefined).value).toBe("date");
  });
});

describe("parseArticleDirection", () => {
  // 每個排序自帶它讀起來自然的方向：日期看最近的，刊期從第一期往下讀。
  it("defaults to the direction the sort reads first", () => {
    expect(parseArticleDirection(undefined, parseArticleSort("date"))).toBe("desc");
    expect(parseArticleDirection(undefined, parseArticleSort("issue"))).toBe("asc");
  });

  it("honours an explicit direction", () => {
    expect(parseArticleDirection("asc", parseArticleSort("date"))).toBe("asc");
  });
});

describe("nextDirection", () => {
  const date = parseArticleSort("date");
  const issue = parseArticleSort("issue");

  it("flips the direction when the active column is clicked again", () => {
    expect(nextDirection(date, date, "desc")).toBe("asc");
    expect(nextDirection(date, date, "asc")).toBe("desc");
  });

  it("uses the column's own default when switching columns", () => {
    expect(nextDirection(issue, date, "asc")).toBe("asc");
    expect(nextDirection(date, issue, "asc")).toBe("desc");
  });
});

describe("articleOrderBy", () => {
  it("sorts undated issues last", () => {
    expect(articleOrderBy(parseArticleSort("date"), "desc")).toEqual([
      { article: { issue: { publishSort: { sort: "desc", nulls: "last" } } } },
    ]);
  });

  // 跨刊時期號本身排不出東西，得先把同一本刊聚在一起。
  it("orders by magazine before issue order", () => {
    expect(articleOrderBy(parseArticleSort("issue"), "asc")).toEqual([
      { article: { issue: { magazine: { name: "asc" } } } },
      { article: { issue: { order: "asc" } } },
    ]);
  });
});
