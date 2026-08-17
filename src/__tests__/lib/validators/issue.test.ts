import {
  issueCreateSchema,
  issueUpdateSchema,
  withIssueSlug,
  withIssueSlugIfPresent,
} from "@/lib/validators/issue";

describe("issueCreateSchema", () => {
  it("should validate a valid issue with required fields", () => {
    const input = {
      magazineId: "mag-123",
      issueNumber: "第1期",
      publishDate: "2023-01-15",
    };
    const result = issueCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.magazineId).toBe("mag-123");
      expect(result.data.issueNumber).toBe("第1期");
      expect(result.data.publishDate).toBe("2023-01-15");
    }
  });

  it("should validate a complete issue with all fields", () => {
    const input = {
      magazineId: "mag-123",
      issueNumber: "第100期",
      volumeNumber: "Vol. 10",
      title: "創刊百期特輯",
      publishDate: "2023-06-01",
      coverImage: "https://example.com/cover100.jpg",
      tocImages: ["https://example.com/toc100.jpg", "https://example.com/toc100-2.jpg"],
      pageCount: 180,
      price: 199,
      notes: "附贈海報",
    };
    const result = issueCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.issueNumber).toBe("第100期");
      expect(result.data.volumeNumber).toBe("Vol. 10");
      expect(result.data.pageCount).toBe(180);
      expect(result.data.price).toBe(199);
    }
  });

  it("should fail when magazineId is empty", () => {
    const input = {
      magazineId: "",
      issueNumber: "第1期",
      publishDate: "2023-01-15",
    };
    const result = issueCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("期刊 ID 為必填");
    }
  });

  it("should fail when issueNumber is empty", () => {
    const input = {
      magazineId: "mag-123",
      issueNumber: "",
      publishDate: "2023-01-15",
    };
    const result = issueCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("期號為必填");
    }
  });

  it("should fail when publishDate is missing", () => {
    const input = {
      magazineId: "mag-123",
      issueNumber: "第1期",
    };
    const result = issueCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("keeps publishDate as EDTF, at whatever precision", () => {
    for (const value of ["2023-12-25", "2023-12", "2023", "2023-22"]) {
      const result = issueCreateSchema.safeParse({
        magazineId: "mag-123",
        issueNumber: "第1期",
        publishDate: value,
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.publishDate).toBe(value);
    }
  });

  it("rejects a publishDate that is not valid EDTF", () => {
    const result = issueCreateSchema.safeParse({
      magazineId: "mag-123",
      issueNumber: "第1期",
      publishDate: "2023年12月",
    });
    expect(result.success).toBe(false);
  });

  it("should coerce pageCount from string to number", () => {
    const input = {
      magazineId: "mag-123",
      issueNumber: "第1期",
      publishDate: "2023-01-15",
      pageCount: "150",
    };
    const result = issueCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageCount).toBe(150);
    }
  });

  it("should coerce price from string to number", () => {
    const input = {
      magazineId: "mag-123",
      issueNumber: "第1期",
      publishDate: "2023-01-15",
      price: "199.5",
    };
    const result = issueCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(199.5);
    }
  });

  it("should treat empty pageCount and price as null", () => {
    const input = {
      magazineId: "mag-123",
      issueNumber: "第1期",
      publishDate: "2023-01-15",
      pageCount: "",
      price: "",
    };
    const result = issueCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageCount).toBeNull();
      expect(result.data.price).toBeNull();
    }
  });

  it("should fail when pageCount is negative", () => {
    const input = {
      magazineId: "mag-123",
      issueNumber: "第1期",
      publishDate: "2023-01-15",
      pageCount: -10,
    };
    const result = issueCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should fail when price is negative", () => {
    const input = {
      magazineId: "mag-123",
      issueNumber: "第1期",
      publishDate: "2023-01-15",
      price: -50,
    };
    const result = issueCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should accept null for optional fields", () => {
    const input = {
      magazineId: "mag-123",
      issueNumber: "第1期",
      publishDate: "2023-01-15",
      volumeNumber: null,
      title: null,
      coverImage: null,
      tocImages: [],
      pageCount: null,
      price: null,
      notes: null,
    };
    const result = issueCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should accept order when omitted", () => {
    const input = {
      magazineId: "mag-123",
      issueNumber: "第1期",
      publishDate: "2023-01-15",
    };
    const result = issueCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.order).toBeUndefined();
    }
  });

  it("should accept order as a positive integer", () => {
    const input = {
      magazineId: "mag-123",
      issueNumber: "第1期",
      publishDate: "2023-01-15",
      order: 5,
    };
    const result = issueCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.order).toBe(5);
    }
  });

  it("should coerce order from string to number", () => {
    const input = {
      magazineId: "mag-123",
      issueNumber: "第1期",
      publishDate: "2023-01-15",
      order: "3",
    };
    const result = issueCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.order).toBe(3);
    }
  });
});

describe("issueUpdateSchema", () => {
  it("should validate partial updates", () => {
    const input = {
      issueNumber: "新期號",
    };
    const result = issueUpdateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should allow empty object", () => {
    const input = {};
    const result = issueUpdateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should not include magazineId in update schema", () => {
    const input = {
      magazineId: "new-mag-id",
      issueNumber: "新期號",
    };
    const result = issueUpdateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      // magazineId should be stripped/ignored
      expect(result.data).not.toHaveProperty("magazineId");
    }
  });

  it("should validate price update only", () => {
    const input = {
      price: 250,
    };
    const result = issueUpdateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(250);
    }
  });

  it("should accept order in update schema", () => {
    const input = {
      order: 2,
    };
    const result = issueUpdateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.order).toBe(2);
    }
  });
});

describe("issueUpdateSchema defaults", () => {
  it("leaves tocImages alone when it is not supplied", () => {
    const result = issueUpdateSchema.safeParse({ price: 120 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("tocImages");
    }
  });

  it("leaves altNumbers alone when it is not supplied", () => {
    const result = issueUpdateSchema.safeParse({ price: 120 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("altNumbers");
    }
  });

  it("takes the other numbers printed on the same issue", () => {
    const result = issueUpdateSchema.safeParse({
      altNumbers: ["2014 02", "HK VOL 308", "1月30日號"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.altNumbers).toEqual([
        "2014 02",
        "HK VOL 308",
        "1月30日號",
      ]);
    }
  });
});

// 期號會被修（打錯字、補全名），但 slug 一旦公開就不能自己跑掉。
describe("withIssueSlug", () => {
  it("derives the slug from the issue number when none is given", () => {
    expect(withIssueSlug({ issueNumber: "第163期" })).toEqual({
      issueNumber: "第163期",
      slug: "163",
    });
  });

  it("keeps the slug the editor typed", () => {
    expect(withIssueSlug({ issueNumber: "468", slug: "2014-01-30" })).toEqual({
      issueNumber: "468",
      slug: "2014-01-30",
    });
  });
});

describe("withIssueSlugIfPresent", () => {
  it("drops a blank slug rather than writing one", () => {
    expect(withIssueSlugIfPresent({ issueNumber: "164", slug: null })).toEqual({
      issueNumber: "164",
    });
  });

  it("leaves an explicit slug in place", () => {
    expect(withIssueSlugIfPresent({ slug: "創刊號" })).toEqual({ slug: "創刊號" });
  });
});
