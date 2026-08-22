import {
  sortTitlePeriods,
  splitIssuesByPeriod,
  titleForIssue,
  titlePeriodFor,
} from "@/lib/magazine-title";

// 電視遊樂雜誌：1–292 期為本名，293 期起改名 GAME fans。
const titles = [
  { title: "GAME fans", startIssue: { order: 293 } },
  { title: "電視遊樂雜誌", startIssue: { order: 1 } },
];

describe("titlePeriodFor", () => {
  it("picks the period whose start is the latest one at or before the issue", () => {
    expect(titlePeriodFor(titles, 150)?.title).toBe("電視遊樂雜誌");
    expect(titlePeriodFor(titles, 295)?.title).toBe("GAME fans");
  });

  it("treats the start issue itself as part of the new period", () => {
    expect(titlePeriodFor(titles, 293)?.title).toBe("GAME fans");
    expect(titlePeriodFor(titles, 292)?.title).toBe("電視遊樂雜誌");
    expect(titlePeriodFor(titles, 1)?.title).toBe("電視遊樂雜誌");
  });

  it("returns null before the first period and when there are no titles", () => {
    // titles 沒建齊（第一筆不從第一期起）時，前面的期 fallback。
    expect(titlePeriodFor([{ title: "GAME fans", startIssue: { order: 293 } }], 5)).toBeNull();
    expect(titlePeriodFor([], 5)).toBeNull();
  });
});

describe("titleForIssue", () => {
  it("falls back to the magazine name", () => {
    expect(titleForIssue([], 5, "電視遊樂雜誌")).toBe("電視遊樂雜誌");
    expect(titleForIssue(titles, 300, "電視遊樂雜誌")).toBe("GAME fans");
  });
});

describe("sortTitlePeriods", () => {
  it("orders by start issue order without mutating the input", () => {
    const sorted = sortTitlePeriods(titles);
    expect(sorted.map((t) => t.title)).toEqual(["電視遊樂雜誌", "GAME fans"]);
    expect(titles[0].title).toBe("GAME fans");
  });
});

describe("splitIssuesByPeriod", () => {
  const issue = (order: number) => ({ order });

  it("splits an ordered issue list at each period boundary", () => {
    const segments = splitIssuesByPeriod(titles, [291, 292, 293, 294].map(issue));
    expect(segments.map((s) => s.period?.title)).toEqual(["電視遊樂雜誌", "GAME fans"]);
    expect(segments.map((s) => s.issues.length)).toEqual([2, 2]);
  });

  it("puts issues before the first period into a null segment", () => {
    const partial = [{ title: "GAME fans", startIssue: { order: 293 } }];
    const segments = splitIssuesByPeriod(partial, [1, 293].map(issue));
    expect(segments[0].period).toBeNull();
    expect(segments[1].period?.title).toBe("GAME fans");
  });

  it("returns one segment when nothing splits, and none for no issues", () => {
    expect(splitIssuesByPeriod([], [1, 2].map(issue))).toHaveLength(1);
    expect(splitIssuesByPeriod(titles, [])).toHaveLength(0);
  });
});
