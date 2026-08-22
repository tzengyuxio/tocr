import "../__mocks__/prisma";
import { touchesData } from "@/lib/issue-complete";

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
