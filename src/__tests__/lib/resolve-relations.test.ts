/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { resolveGameIds, resolveTagIds } from "@/lib/resolve-relations";

beforeEach(() => {
  resetPrismaMock();
});

describe("resolveGameIds", () => {
  it("reuses a game that already exists", async () => {
    prismaMock.game.findFirst.mockResolvedValue({ id: "game-1" });

    const ids = await resolveGameIds(prismaMock as never, ["Zelda"]);

    expect(ids).toEqual(["game-1"]);
    expect(prismaMock.game.create).not.toHaveBeenCalled();
  });

  it("creates a game that does not exist yet", async () => {
    prismaMock.game.findFirst.mockResolvedValue(null);
    prismaMock.game.create.mockResolvedValue({ id: "game-new" });

    const ids = await resolveGameIds(prismaMock as never, ["新遊戲"]);

    expect(ids).toEqual(["game-new"]);
    expect(prismaMock.game.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "新遊戲" }),
      })
    );
  });

  it("matches case-insensitively across all three name columns", async () => {
    prismaMock.game.findFirst.mockResolvedValue({ id: "game-1" });

    await resolveGameIds(prismaMock as never, ["zelda"]);

    expect(prismaMock.game.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: { equals: "zelda", mode: "insensitive" } },
          { nameEn: { equals: "zelda", mode: "insensitive" } },
          { nameOriginal: { equals: "zelda", mode: "insensitive" } },
        ],
      },
    });
  });

  it("keeps input order, so the caller can pick the first as primary", async () => {
    prismaMock.game.findFirst
      .mockResolvedValueOnce({ id: "a" })
      .mockResolvedValueOnce({ id: "b" });

    expect(await resolveGameIds(prismaMock as never, ["A", "B"])).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("resolveTagIds", () => {
  it("reuses a tag that already exists", async () => {
    prismaMock.tag.findFirst.mockResolvedValue({ id: "tag-1" });

    const ids = await resolveTagIds(prismaMock as never, [
      { name: "攻略", type: "GENERAL" },
    ]);

    expect(ids).toEqual(["tag-1"]);
    expect(prismaMock.tag.create).not.toHaveBeenCalled();
  });

  it("falls back to GENERAL for a type the enum does not know", async () => {
    prismaMock.tag.findFirst.mockResolvedValue(null);
    prismaMock.tag.create.mockResolvedValue({ id: "tag-new" });

    await resolveTagIds(prismaMock as never, [{ name: "X", type: "NONSENSE" }]);

    expect(prismaMock.tag.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "GENERAL" }),
      })
    );
  });
});
