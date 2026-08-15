import {
  displayNameSchema,
  isSyntheticUser,
  MAX_DISPLAY_NAME_LENGTH,
} from "@/lib/validators/user";

function parse(name: string) {
  return displayNameSchema.safeParse({ name });
}

describe("displayNameSchema", () => {
  it("accepts an ordinary name", () => {
    expect(parse("曾于修").success).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    const result = displayNameSchema.parse({ name: "  阿修  " });

    expect(result.name).toBe("阿修");
  });

  it("rejects a name that is only whitespace", () => {
    expect(parse("   ").success).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(parse("").success).toBe(false);
  });

  it("accepts a name at the length limit", () => {
    expect(parse("字".repeat(MAX_DISPLAY_NAME_LENGTH)).success).toBe(true);
  });

  it("rejects a name past the length limit", () => {
    expect(parse("字".repeat(MAX_DISPLAY_NAME_LENGTH + 1)).success).toBe(false);
  });

  // Taking the import script's name would make a person's edits read as the
  // script's in the activity feed.
  it("rejects the names the site gives its own accounts", () => {
    expect(parse("司書(NPC)").success).toBe(false);
    expect(parse("Dev User").success).toBe(false);
  });

  it("rejects a reserved name in different case", () => {
    expect(parse("dev user").success).toBe(false);
  });

  it("rejects a reserved name padded with spaces", () => {
    expect(parse("  司書(NPC) ").success).toBe(false);
  });
});

describe("isSyntheticUser", () => {
  it("recognises the accounts whose name code owns", () => {
    expect(isSyntheticUser("api-token")).toBe(true);
    expect(isSyntheticUser("dev-user")).toBe(true);
  });

  it("leaves a real user alone", () => {
    expect(isSyntheticUser("cmsog8lst000p56um6r2vd9h4")).toBe(false);
  });
});
