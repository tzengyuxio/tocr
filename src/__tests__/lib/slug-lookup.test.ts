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

  it("returns null when neither matches", async () => {
    prismaMock.tag.findUnique.mockResolvedValue(null);

    expect(await resolveSlugParam("tag", "nope")).toBeNull();
  });
});
