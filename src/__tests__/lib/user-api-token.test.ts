/**
 * @jest-environment node
 */
import { createHash } from "node:crypto";
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import {
  generateApiToken,
  hashToken,
  resolveApiToken,
} from "@/lib/user-api-token";

const TOKEN = "tocr_abcdefghijklmnopqrstuvwxyz";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "tok-1",
    userId: "u1",
    revokedAt: null,
    lastUsedAt: null,
    user: { role: "EDITOR" },
    ...overrides,
  };
}

beforeEach(() => {
  resetPrismaMock();
  prismaMock.apiToken.update.mockResolvedValue({});
});

describe("generateApiToken", () => {
  it("keeps only a hash of what it hands out", () => {
    const { token, tokenHash, prefix } = generateApiToken();

    expect(token.startsWith("tocr_")).toBe(true);
    expect(tokenHash).toBe(createHash("sha256").update(token).digest("hex"));
    expect(tokenHash).not.toContain(token);
    expect(token.startsWith(prefix)).toBe(true);
  });

  it("does not repeat itself", () => {
    expect(generateApiToken().token).not.toBe(generateApiToken().token);
  });
});

describe("resolveApiToken", () => {
  it("names the owner of a valid token", async () => {
    prismaMock.apiToken.findUnique.mockResolvedValue(row());

    expect(await resolveApiToken(`Bearer ${TOKEN}`)).toEqual({
      userId: "u1",
      tokenId: "tok-1",
    });
    expect(prismaMock.apiToken.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: hashToken(TOKEN) } })
    );
  });

  it("rejects a revoked token", async () => {
    prismaMock.apiToken.findUnique.mockResolvedValue(
      row({ revokedAt: new Date() })
    );

    expect(await resolveApiToken(`Bearer ${TOKEN}`)).toBeNull();
  });

  it("rejects a token nobody issued", async () => {
    prismaMock.apiToken.findUnique.mockResolvedValue(null);

    expect(await resolveApiToken(`Bearer ${TOKEN}`)).toBeNull();
  });

  // The whole point of tying a token to a person: taking the role away has to
  // take the token with it, without anyone remembering to revoke it.
  it("rejects a token whose owner is no longer an editor", async () => {
    prismaMock.apiToken.findUnique.mockResolvedValue(
      row({ user: { role: "VIEWER" } })
    );

    expect(await resolveApiToken(`Bearer ${TOKEN}`)).toBeNull();
  });

  it.each([
    ["nothing", undefined],
    ["a header that is not a Bearer", "Basic abc"],
    ["an empty Bearer", "Bearer "],
    ["the shared env-var token, which is not one of ours", "Bearer s3cret"],
  ])("costs no database round trip for %s", async (_label, header) => {
    expect(await resolveApiToken(header)).toBeNull();
    expect(prismaMock.apiToken.findUnique).not.toHaveBeenCalled();
  });

  // A bulk import is hundreds of requests; each one writing lastUsedAt would
  // double the writes for a field nobody reads to the minute.
  it("records that the token was used", async () => {
    prismaMock.apiToken.findUnique.mockResolvedValue(row());

    await resolveApiToken(`Bearer ${TOKEN}`);

    expect(prismaMock.apiToken.update).toHaveBeenCalledTimes(1);
  });

  it("does not write lastUsedAt again straight away", async () => {
    prismaMock.apiToken.findUnique.mockResolvedValue(
      row({ lastUsedAt: new Date() })
    );

    await resolveApiToken(`Bearer ${TOKEN}`);

    expect(prismaMock.apiToken.update).not.toHaveBeenCalled();
  });

  // The request did real work; failing it over a timestamp would be absurd.
  it("still authenticates when the timestamp write fails", async () => {
    prismaMock.apiToken.findUnique.mockResolvedValue(row());
    prismaMock.apiToken.update.mockRejectedValue(new Error("db down"));
    const logged = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(await resolveApiToken(`Bearer ${TOKEN}`)).toEqual({
      userId: "u1",
      tokenId: "tok-1",
    });

    logged.mockRestore();
  });
});
