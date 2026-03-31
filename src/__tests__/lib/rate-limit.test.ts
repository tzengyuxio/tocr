import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  const config = { maxRequests: 3, windowMs: 1000 };

  it("allows requests within limit", () => {
    const key = "test-allow-" + Date.now();
    const r1 = checkRateLimit(key, config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(key, config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(key, config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests exceeding limit", () => {
    const key = "test-block-" + Date.now();
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, config);
    }

    const blocked = checkRateLimit(key, config);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetMs).toBeGreaterThan(0);
  });

  it("uses separate limits for different keys", () => {
    const ts = Date.now();
    const key1 = "test-sep1-" + ts;
    const key2 = "test-sep2-" + ts;

    for (let i = 0; i < 3; i++) {
      checkRateLimit(key1, config);
    }

    const blockedKey1 = checkRateLimit(key1, config);
    expect(blockedKey1.allowed).toBe(false);

    const allowedKey2 = checkRateLimit(key2, config);
    expect(allowedKey2.allowed).toBe(true);
  });

  it("allows requests after window expires", async () => {
    const shortConfig = { maxRequests: 1, windowMs: 100 };
    const key = "test-expire-" + Date.now();

    checkRateLimit(key, shortConfig);
    const blocked = checkRateLimit(key, shortConfig);
    expect(blocked.allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 150));

    const allowed = checkRateLimit(key, shortConfig);
    expect(allowed.allowed).toBe(true);
  });
});
