import "../__mocks__/prisma";
import { touchesData, withoutCompleteMark } from "@/lib/issue-complete";

describe("touchesData", () => {
  // 這兩個記的是判斷而不是資料：完備標記自己不該讓自己失效，目錄複查同理。
  it("ignores the stamps that record judgements rather than data", () => {
    expect(touchesData({})).toBe(false);
    expect(touchesData({ completeAt: {}, completeStaleAt: {} })).toBe(false);
    expect(touchesData({ tocReviewedAt: {} })).toBe(false);
  });

  it("counts any other field", () => {
    expect(touchesData({ title: {} })).toBe(true);
    expect(touchesData({ tocReviewedAt: {}, coverImage: {} })).toBe(true);
  });
});

describe("withoutCompleteMark", () => {
  it("takes the mark off and leaves the rest of the row", () => {
    const issue = {
      id: "iss-1",
      issueNumber: "第1期",
      completeAt: new Date("2026-08-22"),
      completeStaleAt: null,
    };
    const stripped = withoutCompleteMark(issue);

    expect("completeAt" in stripped).toBe(false);
    expect("completeStaleAt" in stripped).toBe(false);
    expect(stripped.issueNumber).toBe("第1期");
    // 傳進來的那筆不動：呼叫端還要拿它做別的事。
    expect(issue.completeAt).toBeInstanceOf(Date);
  });
});
