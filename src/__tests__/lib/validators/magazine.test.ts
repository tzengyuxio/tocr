import { magazineCreateSchema, magazineUpdateSchema } from "@/lib/validators/magazine";

describe("magazineCreateSchema", () => {
  it("should validate a valid magazine with required fields only", () => {
    const input = {
      name: "電玩雜誌",
      slug: "gm",
    };
    const result = magazineCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("電玩雜誌");
      expect(result.data.isActive).toBe(true); // default value
    }
  });

  it("should validate a complete magazine with all fields", () => {
    const input = {
      name: "電玩雜誌",
      slug: "gm",
      nameParallel: "Game Magazine",
      sourceTitle: "ゲーム雑誌",
      publisher: "遊戲出版社",
      issn: "1234-5678",
      description: "遊戲資訊雜誌",
      logoImage: "https://example.com/cover.jpg",
      foundedDate: "2000-01-01",
      endedDate: "2020-12-31",
      isActive: false,
    };
    const result = magazineCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("電玩雜誌");
      expect(result.data.nameParallel).toBe("Game Magazine");
      expect(result.data.sourceTitle).toBe("ゲーム雑誌");
      expect(result.data.publisher).toBe("遊戲出版社");
      expect(result.data.issn).toBe("1234-5678");
      expect(result.data.isActive).toBe(false);
      expect(result.data.foundedDate).toBe("2000-01-01");
      expect(result.data.endedDate).toBe("2020-12-31");
    }
  });

  it("should fail when name is empty", () => {
    const input = {
      name: "",
    };
    const result = magazineCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("雜誌名稱為必填");
    }
  });

  it("should fail when name is missing", () => {
    const input = {};
    const result = magazineCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should accept null for optional fields", () => {
    const input = {
      name: "電玩雜誌",
      slug: "gm",
      nameParallel: null,
      sourceTitle: null,
      publisher: null,
      description: null,
    };
    const result = magazineCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("keeps EDTF dates as written, at whatever precision", () => {
    for (const value of ["2000-01-15", "2000-01", "2000", "2000-22"]) {
      const result = magazineCreateSchema.safeParse({
        name: "電玩雜誌",
        slug: "gm",
        foundedDate: value,
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.foundedDate).toBe(value);
    }
  });

  it("rejects a date that is not valid EDTF", () => {
    const result = magazineCreateSchema.safeParse({
      name: "電玩雜誌",
      slug: "gm",
      foundedDate: "2000年1月",
    });
    expect(result.success).toBe(false);
  });

  it("should treat an empty issn as null", () => {
    const input = { name: "電玩雜誌", slug: "gm", issn: "" };
    const result = magazineCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.issn).toBeNull();
    }
  });

  it("should treat empty date strings as null", () => {
    const input = {
      name: "電玩雜誌",
      slug: "gm",
      foundedDate: "",
      endedDate: "",
    };
    const result = magazineCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.foundedDate).toBeNull();
      expect(result.data.endedDate).toBeNull();
    }
  });
});

// 期刊 slug 是每一條單期網址的前綴，中文會 percent-encode 成最常被分享的那類
// 網址，所以這裡刻意比 Game.slug / Tag.slug 嚴。
describe("magazineCreateSchema slug", () => {
  const withSlug = (slug: string) =>
    magazineCreateSchema.safeParse({ name: "電玩雜誌", slug });

  it("accepts lowercase ascii, digits and hyphens", () => {
    for (const slug of ["ace", "dps-tw", "game100"]) {
      expect(withSlug(slug).success).toBe(true);
    }
  });

  it("rejects Chinese, uppercase and spaces", () => {
    for (const slug of ["電玩雜誌", "ACE", "dps tw", "dps_tw"]) {
      expect(withSlug(slug).success).toBe(false);
    }
  });

  it("is required", () => {
    expect(magazineCreateSchema.safeParse({ name: "電玩雜誌" }).success).toBe(false);
  });
});

describe("magazineUpdateSchema", () => {
  it("should validate partial updates", () => {
    const input = {
      name: "新雜誌名稱",
    };
    const result = magazineUpdateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should allow empty object (no updates)", () => {
    const input = {};
    const result = magazineUpdateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should validate single field update", () => {
    const input = {
      isActive: false,
    };
    const result = magazineUpdateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(false);
    }
  });
});

describe("magazineUpdateSchema defaults", () => {
  it("leaves isActive and aliases alone when they are not supplied", () => {
    const result = magazineUpdateSchema.safeParse({ publisher: "某出版社" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("isActive");
      expect(result.data).not.toHaveProperty("aliases");
    }
  });
});

describe("magazineCreateSchema 的已知總期數", () => {
  const base = { name: "立東軟體", slug: "lidong-software" };

  it("takes a positive integer", () => {
    const result = magazineCreateSchema.safeParse({ ...base, knownIssueCount: "24" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.knownIssueCount).toBe(24);
  });

  // 空字串是「沒填」，不是 0——表單送出的未填欄位長這樣。
  it("reads a blank field as absent", () => {
    const result = magazineCreateSchema.safeParse({ ...base, knownIssueCount: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.knownIssueCount).toBeNull();
  });

  // 0 的意思會變成「一期都沒出過」，那是另一件事，不是「查不到」。
  it("rejects zero and negatives", () => {
    expect(magazineCreateSchema.safeParse({ ...base, knownIssueCount: 0 }).success).toBe(false);
    expect(magazineCreateSchema.safeParse({ ...base, knownIssueCount: -3 }).success).toBe(false);
  });
});
