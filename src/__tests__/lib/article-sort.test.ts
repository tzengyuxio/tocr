import { byPageNumber } from "@/lib/article-sort";

const page = (pageStart: number | null, pageEnd: number | null = null) => ({
  pageStart,
  pageEnd,
});

describe("byPageNumber", () => {
  it("orders by the starting page", () => {
    const sorted = [page(58), page(8), page(102)].sort(byPageNumber);
    expect(sorted.map((a) => a.pageStart)).toEqual([8, 58, 102]);
  });

  it("keeps articles without a page number at the end", () => {
    const sorted = [page(null), page(58), page(null), page(8)].sort(byPageNumber);
    expect(sorted.map((a) => a.pageStart)).toEqual([8, 58, null, null]);
  });

  it("breaks a tie on the starting page with the ending page", () => {
    const sorted = [page(12, 20), page(12, 14), page(12, null)].sort(byPageNumber);
    expect(sorted.map((a) => a.pageEnd)).toEqual([null, 14, 20]);
  });

  it("treats two unpaginated articles as equal", () => {
    expect(byPageNumber(page(null), page(null))).toBe(0);
  });

  it("puts the main magazine before a supplement with its own page numbers", () => {
    const sorted = [
      { pageSection: "別冊", ...page(2) },
      { pageSection: null, ...page(4) },
      { pageSection: "別冊", ...page(1) },
      { pageSection: null, ...page(120) },
    ].sort(byPageNumber);
    expect(sorted.map((a) => `${a.pageSection ?? ""}${a.pageStart}`)).toEqual([
      "4",
      "120",
      "別冊1",
      "別冊2",
    ]);
  });
});
