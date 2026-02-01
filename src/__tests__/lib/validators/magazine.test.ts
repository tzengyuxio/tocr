import { magazineCreateSchema, magazineUpdateSchema } from "@/lib/validators/magazine";

describe("magazineCreateSchema", () => {
  it("should validate a valid magazine with required fields only", () => {
    const input = {
      name: "電玩雜誌",
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
      nameEn: "Game Magazine",
      publisher: "遊戲出版社",
      issn: "1234-5678",
      description: "遊戲資訊雜誌",
      coverImage: "https://example.com/cover.jpg",
      foundedDate: "2000-01-01",
      endedDate: "2020-12-31",
      isActive: false,
    };
    const result = magazineCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("電玩雜誌");
      expect(result.data.nameEn).toBe("Game Magazine");
      expect(result.data.publisher).toBe("遊戲出版社");
      expect(result.data.issn).toBe("1234-5678");
      expect(result.data.isActive).toBe(false);
      expect(result.data.foundedDate).toBeInstanceOf(Date);
      expect(result.data.endedDate).toBeInstanceOf(Date);
    }
  });

  it("should fail when name is empty", () => {
    const input = {
      name: "",
    };
    const result = magazineCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("期刊名稱為必填");
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
      nameEn: null,
      publisher: null,
      description: null,
    };
    const result = magazineCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should coerce date strings to Date objects", () => {
    const input = {
      name: "電玩雜誌",
      foundedDate: "2000-01-15",
    };
    const result = magazineCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.foundedDate).toBeInstanceOf(Date);
      expect(result.data.foundedDate?.getFullYear()).toBe(2000);
    }
  });
});

describe("magazineUpdateSchema", () => {
  it("should validate partial updates", () => {
    const input = {
      name: "新期刊名稱",
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
