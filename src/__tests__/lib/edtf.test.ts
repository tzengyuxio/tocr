import { isValidEdtf, edtfSortDate, formatEdtf } from "@/lib/edtf";

describe("isValidEdtf", () => {
  it.each(["1989-04-08", "1999-05", "1994", "1994-22", "1999-05?", "1999-05~"])(
    "accepts %s",
    (value) => {
      expect(isValidEdtf(value)).toBe(true);
    }
  );

  it.each(["", "bogus", "1999-13", "99-05"])("rejects %s", (value) => {
    expect(isValidEdtf(value)).toBe(false);
  });
});

describe("edtfSortDate", () => {
  it("uses the start of the covered range", () => {
    expect(edtfSortDate("1994")?.getUTCFullYear()).toBe(1994);
    expect(edtfSortDate("1994")?.getUTCMonth()).toBe(0);
    expect(edtfSortDate("1999-05")?.getUTCMonth()).toBe(4);
    expect(edtfSortDate("1989-04-08")?.getUTCDate()).toBe(8);
  });

  it("orders coarse and precise values consistently", () => {
    const year = edtfSortDate("1994")!.getTime();
    const month = edtfSortDate("1994-06")!.getTime();
    const next = edtfSortDate("1995")!.getTime();
    expect(year).toBeLessThan(month);
    expect(month).toBeLessThan(next);
  });

  it("returns null for an unparseable value", () => {
    expect(edtfSortDate("bogus")).toBeNull();
  });
});

describe("formatEdtf", () => {
  it.each([
    ["1989-04-08", "1989 年 4 月 8 日"],
    ["1999-05", "1999 年 5 月"],
    ["1994", "1994 年"],
    ["1994-22", "1994 年夏季"],
    ["1994-21", "1994 年春季"],
    ["1999-05?", "1999 年 5 月（存疑）"],
    ["1999-05~", "約 1999 年 5 月"],
  ])("renders %s as %s", (value, expected) => {
    expect(formatEdtf(value)).toBe(expected);
  });

  it("passes through values it cannot render", () => {
    expect(formatEdtf("bogus")).toBe("bogus");
  });
});
