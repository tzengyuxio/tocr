import { issueCreateSchema, withTocReviewedAt } from "@/lib/validators/issue";

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

  it("stamps the review time for a human write", () => {
    const before = Date.now();
    const data = withTocReviewedAt(
      { issueNumber: "第 1 期", tocReviewed: true },
      { isHuman: true }
    );

    expect(data).not.toHaveProperty("tocReviewed");
    expect(data.tocReviewedAt).toBeInstanceOf(Date);
    expect(data.tocReviewedAt!.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("clears the review when a human unticks it", () => {
    const data = withTocReviewedAt({ tocReviewed: false }, { isHuman: true });

    expect(data.tocReviewedAt).toBeNull();
  });

  it("drops the flag from scripted writes, which have read nothing", () => {
    const data = withTocReviewedAt({ tocReviewed: true }, { isHuman: false });

    expect(data).not.toHaveProperty("tocReviewedAt");
    expect(data).not.toHaveProperty("tocReviewed");
  });

  it("leaves the stored value alone when the flag is absent", () => {
    const data = withTocReviewedAt(
      { issueNumber: "第 2 期", tocReviewed: undefined },
      { isHuman: true }
    );

    expect(data).not.toHaveProperty("tocReviewedAt");
    expect(data.issueNumber).toBe("第 2 期");
  });
});
