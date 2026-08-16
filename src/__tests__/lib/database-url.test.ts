import { pinSslMode } from "@/lib/database-url";

const BASE = "postgresql://user:pw@db.example.neon.tech/tocr";

describe("pinSslMode", () => {
  it("pins require to the behaviour it has today", () => {
    expect(pinSslMode(`${BASE}?sslmode=require`)).toBe(
      `${BASE}?sslmode=verify-full`
    );
  });

  it("pins prefer and verify-ca as well", () => {
    expect(pinSslMode(`${BASE}?sslmode=prefer`)).toContain("sslmode=verify-full");
    expect(pinSslMode(`${BASE}?sslmode=verify-ca`)).toContain(
      "sslmode=verify-full"
    );
  });

  it("keeps the other query parameters", () => {
    const pinned = pinSslMode(`${BASE}?sslmode=require&connect_timeout=10`);

    expect(pinned).toContain("sslmode=verify-full");
    expect(pinned).toContain("connect_timeout=10");
  });

  it("leaves verify-full alone", () => {
    const url = `${BASE}?sslmode=verify-full`;

    expect(pinSslMode(url)).toBe(url);
  });

  // Someone who wrote these meant them.
  it("leaves disable and no-verify alone", () => {
    expect(pinSslMode(`${BASE}?sslmode=disable`)).toBe(`${BASE}?sslmode=disable`);
    expect(pinSslMode(`${BASE}?sslmode=no-verify`)).toBe(
      `${BASE}?sslmode=no-verify`
    );
  });

  // The libpq flag is an explicit opt-in to the weaker semantics.
  it("leaves a URL that asked for libpq compatibility alone", () => {
    const url = `${BASE}?sslmode=require&uselibpqcompat=true`;

    expect(pinSslMode(url)).toBe(url);
  });

  // The local container speaks plain TCP.
  it("leaves a URL without sslmode alone", () => {
    const url = "postgresql://postgres:password@localhost:5432/tocr";

    expect(pinSslMode(url)).toBe(url);
  });

  it("hands an unparseable string back for pg to complain about", () => {
    expect(pinSslMode("not a url")).toBe("not a url");
    expect(pinSslMode("")).toBe("");
  });
});
