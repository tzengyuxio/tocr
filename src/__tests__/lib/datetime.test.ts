import { formatTaipei } from "@/lib/datetime";

/**
 * These assertions hold whatever TZ the test runner has, which is the point:
 * `date-fns`'s plain `format()` would give a different answer on a UTC server
 * than in a UTC+8 browser, and that is the bug this module exists to close.
 */
describe("formatTaipei", () => {
  it("renders a UTC instant in Taipei time", () => {
    expect(formatTaipei("2026-08-16T03:20:33.580Z", "yyyy/MM/dd HH:mm")).toBe(
      "2026/08/16 11:20"
    );
  });

  it("rolls the date forward for instants late in the UTC day", () => {
    // 20:00 UTC is already 04:00 the next morning in Taipei -- the case where
    // a UTC-rendered page and a browser-rendered one disagreed on the date.
    expect(formatTaipei("2026-08-15T20:00:00Z", "yyyy/MM/dd")).toBe("2026/08/16");
  });

  it("accepts a Date as well as a string", () => {
    expect(formatTaipei(new Date("2026-01-01T16:00:00Z"), "yyyy/MM/dd HH:mm")).toBe(
      "2026/01/02 00:00"
    );
  });

  it("uses the Chinese locale for named patterns", () => {
    expect(formatTaipei("2026-08-16T03:20:00Z", "yyyy 年 M 月 d 日")).toBe(
      "2026 年 8 月 16 日"
    );
  });
});
