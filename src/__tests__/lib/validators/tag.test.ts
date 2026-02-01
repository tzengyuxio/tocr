import { tagCreateSchema, tagUpdateSchema } from "@/lib/validators/tag";

describe("tagCreateSchema", () => {
  it("should validate a valid tag with required fields", () => {
    const input = {
      name: "任天堂",
      slug: "nintendo",
    };
    const result = tagCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("任天堂");
      expect(result.data.slug).toBe("nintendo");
      expect(result.data.type).toBe("GENERAL"); // default value
    }
  });

  it("should validate a complete tag with all fields", () => {
    const input = {
      name: "宮本茂",
      slug: "miyamoto-shigeru",
      type: "PERSON",
      description: "任天堂知名遊戲設計師",
    };
    const result = tagCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("宮本茂");
      expect(result.data.type).toBe("PERSON");
    }
  });

  it("should fail when name is empty", () => {
    const input = {
      name: "",
      slug: "test",
    };
    const result = tagCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("標籤名稱為必填");
    }
  });

  it("should fail when slug is empty", () => {
    const input = {
      name: "測試",
      slug: "",
    };
    const result = tagCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Slug 為必填");
    }
  });

  it("should accept slug with lowercase letters and numbers", () => {
    const input = {
      name: "測試",
      slug: "test123",
    };
    const result = tagCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should accept slug with Chinese characters", () => {
    const input = {
      name: "測試",
      slug: "測試標籤",
    };
    const result = tagCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should accept slug with hyphens", () => {
    const input = {
      name: "測試",
      slug: "test-tag-123",
    };
    const result = tagCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should fail when slug contains uppercase letters", () => {
    const input = {
      name: "測試",
      slug: "TestTag",
    };
    const result = tagCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should fail when slug contains special characters", () => {
    const input = {
      name: "測試",
      slug: "test_tag!",
    };
    const result = tagCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should validate all tag types", () => {
    const types = ["GENERAL", "PERSON", "EVENT", "SERIES", "COMPANY", "PLATFORM"] as const;
    for (const type of types) {
      const input = {
        name: "測試",
        slug: "test",
        type,
      };
      const result = tagCreateSchema.safeParse(input);
      expect(result.success).toBe(true);
    }
  });

  it("should fail with invalid tag type", () => {
    const input = {
      name: "測試",
      slug: "test",
      type: "INVALID_TYPE",
    };
    const result = tagCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe("tagUpdateSchema", () => {
  it("should validate partial updates", () => {
    const input = {
      name: "新名稱",
    };
    const result = tagUpdateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should allow empty object", () => {
    const input = {};
    const result = tagUpdateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should validate type update only", () => {
    const input = {
      type: "COMPANY",
    };
    const result = tagUpdateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("COMPANY");
    }
  });
});
