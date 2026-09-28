import { formatPages } from "@/lib/page-label";

describe("formatPages", () => {
  it("writes a single page or a range", () => {
    expect(formatPages({ pageStart: 6, pageEnd: null })).toBe("p.6");
    expect(formatPages({ pageStart: 6, pageEnd: 6 })).toBe("p.6");
    expect(formatPages({ pageStart: 6, pageEnd: 8 })).toBe("p.6-8");
  });

  it("prefixes the section of a supplement's own page numbers", () => {
    expect(formatPages({ pageSection: "別冊", pageStart: 6, pageEnd: 8 })).toBe(
      "別冊 p.6-8"
    );
  });

  it("falls back to the section alone, or nothing, without a page number", () => {
    expect(formatPages({ pageSection: "別冊", pageStart: null, pageEnd: null })).toBe("別冊");
    expect(formatPages({ pageStart: null, pageEnd: null })).toBeNull();
  });
});
