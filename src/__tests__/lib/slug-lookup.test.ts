/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { resolveSlugParam } from "@/lib/slug-lookup";

beforeEach(() => resetPrismaMock());

describe("resolveSlugParam", () => {
  it("matches on slug first", async () => {
    prismaMock.game.findUnique.mockResolvedValueOnce({ id: "g1", slug: "功夫" });

    expect(await resolveSlugParam("game", "功夫")).toEqual({
      id: "g1",
      slug: "功夫",
    });
    expect(prismaMock.game.findUnique).toHaveBeenCalledTimes(1);
  });

  // 舊網址還在外面流傳，不能直接 404。
  it("falls back to the cuid", async () => {
    prismaMock.game.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "g1", slug: "功夫" });

    expect(await resolveSlugParam("game", "g1")).toEqual({
      id: "g1",
      slug: "功夫",
    });
  });

  // 中文 slug 在網址上是 percent-encoded，Next 不會替我們還原。
  it("decodes a percent-encoded param before looking it up", async () => {
    prismaMock.game.findUnique.mockResolvedValueOnce({ id: "g1", slug: "快打旋風" });

    await resolveSlugParam("game", "%E5%BF%AB%E6%89%93%E6%97%8B%E9%A2%A8");

    expect(prismaMock.game.findUnique).toHaveBeenCalledWith({
      where: { slug: "快打旋風" },
      select: { id: true, slug: true },
    });
  });

  // 壞掉的 escape sequence 會讓 decodeURIComponent 丟例外，那不該變成 500。
  it("survives a malformed escape sequence", async () => {
    prismaMock.game.findUnique.mockResolvedValue(null);

    expect(await resolveSlugParam("game", "%E0%A4%A")).toBeNull();
  });

  it("returns null when neither matches", async () => {
    prismaMock.tag.findUnique.mockResolvedValue(null);

    expect(await resolveSlugParam("tag", "nope")).toBeNull();
  });
});
