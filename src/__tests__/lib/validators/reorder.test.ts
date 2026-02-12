import { reorderSchema } from "@/lib/validators/reorder";

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
