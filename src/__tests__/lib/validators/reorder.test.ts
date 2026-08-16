import { articleReorderSchema, reorderSchema } from "@/lib/validators/reorder";

describe("reorderSchema", () => {
  it("should validate a valid magazineId and issueIds", () => {
    const input = {
      magazineId: "mag-123",
      issueIds: ["iss-1", "iss-2", "iss-3"],
    };
    const result = reorderSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.magazineId).toBe("mag-123");
      expect(result.data.issueIds).toEqual(["iss-1", "iss-2", "iss-3"]);
    }
  });

  it("should fail when magazineId is empty", () => {
    const input = {
      magazineId: "",
      issueIds: ["iss-1"],
    };
    const result = reorderSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should accept an empty issueIds array", () => {
    const input = {
      magazineId: "mag-123",
      issueIds: [],
    };
    const result = reorderSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should fail when issueIds contains an empty string", () => {
    const input = {
      magazineId: "mag-123",
      issueIds: ["iss-1", "", "iss-3"],
    };
    const result = reorderSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should fail when magazineId is missing", () => {
    const input = {
      issueIds: ["iss-1"],
    };
    const result = reorderSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should fail when issueIds is missing", () => {
    const input = {
      magazineId: "mag-123",
    };
    const result = reorderSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe("articleReorderSchema", () => {
  it("should validate a valid issueId and articleIds", () => {
    const input = {
      issueId: "iss-123",
      articleIds: ["art-1", "art-2", "art-3"],
    };
    const result = articleReorderSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.issueId).toBe("iss-123");
      expect(result.data.articleIds).toEqual(["art-1", "art-2", "art-3"]);
    }
  });

  it("should fail when issueId is empty", () => {
    const result = articleReorderSchema.safeParse({
      issueId: "",
      articleIds: ["art-1"],
    });
    expect(result.success).toBe(false);
  });

  it("should accept an empty articleIds array", () => {
    const result = articleReorderSchema.safeParse({
      issueId: "iss-123",
      articleIds: [],
    });
    expect(result.success).toBe(true);
  });

  it("should fail when articleIds contains an empty string", () => {
    const result = articleReorderSchema.safeParse({
      issueId: "iss-123",
      articleIds: ["art-1", "", "art-3"],
    });
    expect(result.success).toBe(false);
  });

  it("should fail when articleIds is missing", () => {
    const result = articleReorderSchema.safeParse({ issueId: "iss-123" });
    expect(result.success).toBe(false);
  });
});
