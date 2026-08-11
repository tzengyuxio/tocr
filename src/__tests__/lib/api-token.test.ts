import { isValidApiToken } from "@/lib/api-token";

const ORIGINAL_TOKEN = process.env.API_TOKEN;

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) {
    delete process.env.API_TOKEN;
  } else {
    process.env.API_TOKEN = ORIGINAL_TOKEN;
  }
});

describe("isValidApiToken", () => {
  it("rejects everything when API_TOKEN is not configured", () => {
    delete process.env.API_TOKEN;
    expect(isValidApiToken("Bearer anything")).toBe(false);
  });

  it("rejects everything when API_TOKEN is empty", () => {
    process.env.API_TOKEN = "";
    expect(isValidApiToken("Bearer ")).toBe(false);
    expect(isValidApiToken("Bearer x")).toBe(false);
  });

  it("accepts the configured token", () => {
    process.env.API_TOKEN = "s3cret-token";
    expect(isValidApiToken("Bearer s3cret-token")).toBe(true);
  });

  it("rejects a wrong token of the same length", () => {
    process.env.API_TOKEN = "s3cret-token";
    expect(isValidApiToken("Bearer s3cret-tokeN")).toBe(false);
  });

  it("rejects a wrong token of a different length", () => {
    process.env.API_TOKEN = "s3cret-token";
    expect(isValidApiToken("Bearer s3cret")).toBe(false);
  });

  it("requires the Bearer scheme", () => {
    process.env.API_TOKEN = "s3cret-token";
    expect(isValidApiToken("s3cret-token")).toBe(false);
    expect(isValidApiToken("Basic s3cret-token")).toBe(false);
  });

  it("rejects a missing header", () => {
    process.env.API_TOKEN = "s3cret-token";
    expect(isValidApiToken(null)).toBe(false);
    expect(isValidApiToken(undefined)).toBe(false);
  });

  it("ignores surrounding whitespace in the header value", () => {
    process.env.API_TOKEN = "s3cret-token";
    expect(isValidApiToken("Bearer  s3cret-token  ")).toBe(true);
  });
});
