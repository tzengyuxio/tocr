/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { ensureUniqueSlug, slugify } from "@/lib/slugify";

beforeEach(() => resetPrismaMock());

describe("slugify", () => {
  it("keeps CJK as-is", () => {
    expect(slugify("棒球聯盟")).toBe("棒球聯盟");
  });

  // 這正是 宇宙傳奇Ⅱ 與 宇宙傳奇Ⅲ 撞成同一個 slug 的原因。
  it("normalises Roman numerals so sequels stay distinct", () => {
    expect(slugify("宇宙傳奇Ⅱ")).toBe("宇宙傳奇ii");
    expect(slugify("宇宙傳奇Ⅲ")).toBe("宇宙傳奇iii");
  });

  it("folds full-width characters", () => {
    expect(slugify("Ｐ－４７")).toBe("p-47");
  });

  it("lowercases and turns punctuation into a single hyphen", () => {
    expect(slugify("Ghostbusters II")).toBe("ghostbusters-ii");
    expect(slugify("P.47")).toBe("p-47");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("《三國志》")).toBe("三國志");
  });

  it("returns an empty string when nothing survives", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("ensureUniqueSlug", () => {
  it("uses the base when it is free", async () => {
    prismaMock.game.findFirst.mockResolvedValue(null);

    expect(await ensureUniqueSlug(prismaMock as never, "game", "功夫")).toBe("功夫");
  });

  it("appends a counter when the base is taken", async () => {
    prismaMock.game.findFirst
      .mockResolvedValueOnce({ id: "other" })
      .mockResolvedValueOnce({ id: "another" })
      .mockResolvedValueOnce(null);

    expect(await ensureUniqueSlug(prismaMock as never, "game", "p-47")).toBe("p-47-3");
  });

  it("does not collide with the row being updated", async () => {
    prismaMock.tag.findFirst.mockResolvedValue(null);

    await ensureUniqueSlug(prismaMock as never, "tag", "攻略", "tag-1");

    expect(prismaMock.tag.findFirst).toHaveBeenCalledWith({
      where: { slug: "攻略", NOT: { id: "tag-1" } },
      select: { id: true },
    });
  });
});
