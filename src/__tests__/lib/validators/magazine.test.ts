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
      nameOriginal: "Game Magazine",
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
      expect(result.data.nameOriginal).toBe("Game Magazine");
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
      nameOriginal: null,
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
        foundedDate: value,
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.foundedDate).toBe(value);
    }
  });

  it("rejects a date that is not valid EDTF", () => {
    const result = magazineCreateSchema.safeParse({
      name: "電玩雜誌",
      foundedDate: "2000年1月",
    });
    expect(result.success).toBe(false);
  });

  it("should treat an empty issn as null", () => {
    const input = { name: "電玩雜誌", issn: "" };
    const result = magazineCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.issn).toBeNull();
    }
  });

  it("should treat empty date strings as null", () => {
    const input = {
      name: "電玩雜誌",
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
