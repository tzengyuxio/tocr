import { formatIssueNumber } from "@/lib/issue-number";

describe("formatIssueNumber", () => {
  it("wraps bare digits", () => {
    expect(formatIssueNumber("216")).toBe("第 216 期");
    expect(formatIssueNumber("1")).toBe("第 1 期");
  });

  it("leaves named issues as written", () => {
    expect(formatIssueNumber("創刊號")).toBe("創刊號");
    expect(formatIssueNumber("試刊號")).toBe("試刊號");
    expect(formatIssueNumber("創刊驚嘆號")).toBe("創刊驚嘆號");
  });

  it("leaves anything that is not purely digits", () => {
    expect(formatIssueNumber("70+71")).toBe("70+71");
    expect(formatIssueNumber("VOL.103")).toBe("VOL.103");
    expect(formatIssueNumber("2014 02")).toBe("2014 02");
    expect(formatIssueNumber("")).toBe("");
  });
});
