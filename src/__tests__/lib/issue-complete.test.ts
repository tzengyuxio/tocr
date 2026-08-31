import "../__mocks__/prisma";
import { isVerifiedIssue, touchesData, withoutCompleteMark } from "@/lib/issue-complete";

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

describe("isVerifiedIssue", () => {
  it("is true only for a mark that has not gone stale", () => {
    const at = new Date("2026-08-22");
    expect(isVerifiedIssue({ completeAt: at, completeStaleAt: null })).toBe(true);
    expect(isVerifiedIssue({ completeAt: at, completeStaleAt: at })).toBe(false);
    expect(isVerifiedIssue({ completeAt: null, completeStaleAt: null })).toBe(false);
  });
});

describe("withoutCompleteMark", () => {
  it("swaps the timestamps for a boolean and leaves the rest of the row", () => {
    const issue = {
      id: "iss-1",
      issueNumber: "第1期",
      completeAt: new Date("2026-08-22"),
      completeStaleAt: null,
    };
    const stripped = withoutCompleteMark(issue);

    // 什麼時候標的、什麼時候失效的都是編輯流程的細節，不外流。
    expect("completeAt" in stripped).toBe(false);
    expect("completeStaleAt" in stripped).toBe(false);
    expect(stripped.isVerified).toBe(true);
    expect(stripped.issueNumber).toBe("第1期");
    // 傳進來的那筆不動：呼叫端還要拿它做別的事。
    expect(issue.completeAt).toBeInstanceOf(Date);
  });

  // 三態收成兩態：對讀者而言「完備・已變更」跟沒標過一樣。
  it("reports a stale mark as unverified", () => {
    const at = new Date("2026-08-22");
    const stripped = withoutCompleteMark({
      id: "iss-2",
      completeAt: at,
      completeStaleAt: at,
    });

    expect(stripped.isVerified).toBe(false);
  });

  it("reports an unmarked issue as unverified", () => {
    const stripped = withoutCompleteMark({ id: "iss-3" });

    expect(stripped.isVerified).toBe(false);
  });
});
