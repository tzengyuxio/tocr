import { issueCreateSchema, withTocReviewedAt } from "@/lib/validators/issue";

const REVIEWED_ON = new Date("2026-01-05T09:00:00Z");

describe("issue tocReviewed", () => {
  it("accepts the flag but never the stored timestamp", () => {
    const parsed = issueCreateSchema.parse({
      magazineId: "m1",
      issueNumber: "第 1 期",
      publishDate: "1994-05",
      tocReviewed: true,
      tocReviewedAt: new Date("1990-01-01"),
    });

    expect(parsed.tocReviewed).toBe(true);
    expect(parsed).not.toHaveProperty("tocReviewedAt");
  });

  it("stamps the review time when a human first ticks it", () => {
    const before = Date.now();
    const data = withTocReviewedAt(
      { issueNumber: "第 1 期", tocReviewed: true },
      { isHuman: true, current: null }
    );

    expect(data).not.toHaveProperty("tocReviewed");
    expect(data.tocReviewedAt).toBeInstanceOf(Date);
    expect(data.tocReviewedAt!.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("keeps the original review date when the issue is saved again", () => {
    const data = withTocReviewedAt(
      { pageCount: 128, tocReviewed: true },
      { isHuman: true, current: REVIEWED_ON }
    );

    expect(data).not.toHaveProperty("tocReviewedAt");
    expect(data.pageCount).toBe(128);
  });

  it("clears the review when a human unticks it", () => {
    const data = withTocReviewedAt(
      { tocReviewed: false },
      { isHuman: true, current: REVIEWED_ON }
    );

    expect(data.tocReviewedAt).toBeNull();
  });

  it("does not write a clear when the issue was never reviewed", () => {
    const data = withTocReviewedAt(
      { tocReviewed: false },
      { isHuman: true, current: null }
    );

    expect(data).not.toHaveProperty("tocReviewedAt");
  });

  it("drops the flag from scripted writes, which have read nothing", () => {
    const data = withTocReviewedAt(
      { tocReviewed: true },
      { isHuman: false, current: null }
    );

    expect(data).not.toHaveProperty("tocReviewedAt");
    expect(data).not.toHaveProperty("tocReviewed");
  });

  it("leaves the stored value alone when the flag is absent", () => {
    const data = withTocReviewedAt(
      { issueNumber: "第 2 期", tocReviewed: undefined },
      { isHuman: true, current: REVIEWED_ON }
    );

    expect(data).not.toHaveProperty("tocReviewedAt");
    expect(data.issueNumber).toBe("第 2 期");
  });
});
