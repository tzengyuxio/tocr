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

  // 時間戳後綴讓每個 slug 都不能當網址用，見 2026-08-16-readable-urls-design.md
  it("gives a new game a readable slug, with no timestamp", async () => {
    prismaMock.game.findFirst.mockResolvedValue(null);
    prismaMock.game.create.mockResolvedValue({ id: "game-new" });

    await resolveGameIds(prismaMock as never, ["宇宙傳奇Ⅱ"]);

    expect(prismaMock.game.create).toHaveBeenCalledWith({
      data: {
        name: "宇宙傳奇Ⅱ",
        slug: "宇宙傳奇ii",
        nameKeys: ["宇宙傳奇ii"],
      },
    });
  });

  // The search box already matched aliases and the recognition path did not,
  // so a name that could be *found* was still *created* a second time.
  it("looks a game up by its normalised key, aliases included", async () => {
    prismaMock.game.findFirst.mockResolvedValue({ id: "game-1" });

    await resolveGameIds(prismaMock as never, ["銀河飛將 II"]);

    expect(prismaMock.game.findFirst).toHaveBeenCalledWith({
      where: { nameKeys: { has: "銀河飛將ii" } },
    });
  });

  it("reuses the game a differently punctuated name keys to", async () => {
    prismaMock.game.findFirst.mockImplementation(({ where }: never) =>
      Promise.resolve(
        (where as { nameKeys: { has: string } }).nameKeys.has === "蝙蝠俠電影版"
          ? { id: "game-1" }
          : null
      )
    );

    const ids = await resolveGameIds(prismaMock as never, ["蝙蝠俠·電影版"]);

    expect(ids).toEqual(["game-1"]);
    expect(prismaMock.game.create).not.toHaveBeenCalled();
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

  // The type *is* the disambiguating dimension for tags, so SERIES:三國志 and
  // GENERAL:三國志 are two tags -- see docs/data-conventions.md.
  it("looks a tag up by key and type together", async () => {
    prismaMock.tag.findFirst.mockResolvedValue(null);
    prismaMock.tag.create.mockResolvedValue({ id: "tag-new" });

    await resolveTagIds(prismaMock as never, [
      { name: "三國志", type: "SERIES" },
    ]);

    expect(prismaMock.tag.findFirst).toHaveBeenCalledWith({
      where: { nameKey: "三國志", type: "SERIES" },
    });
    expect(prismaMock.tag.create).toHaveBeenCalledWith({
      data: {
        name: "三國志",
        nameKey: "三國志",
        slug: "三國志",
        type: "SERIES",
      },
    });
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
