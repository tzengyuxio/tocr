/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { ensureUniqueSlug, issueSlugify, slugify } from "@/lib/slugify";

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

// 同一個期號有三種寫法，網址只該有一種形狀。
describe("issueSlugify", () => {
  it("reduces the three ways of writing a number to the number", () => {
    expect(issueSlugify("163")).toBe("163");
    expect(issueSlugify("第163期")).toBe("163");
    expect(issueSlugify("第 163 期")).toBe("163");
    expect(issueSlugify("VOL.51")).toBe("51");
    expect(issueSlugify("No. 7")).toBe("7");
    expect(issueSlugify("ＶＯＬ．５１")).toBe("51");
  });

  it("drops leading zeros so 007 and 7 cannot both exist", () => {
    expect(issueSlugify("007")).toBe("7");
  });

  it("keeps the words when the number is a name", () => {
    expect(issueSlugify("創刊號")).toBe("創刊號");
    expect(issueSlugify("試刊2號")).toBe("試刊2號");
    expect(issueSlugify("創刊驚嘆號")).toBe("創刊驚嘆號");
  });

  // 合併號在整站是同一條規則：用 "-" 接後半。
  it("joins a merged issue with a hyphen", () => {
    expect(issueSlugify("70+71")).toBe("70-71");
  });

  // 期號不是純數字時不該被當成數字，否則 GAMEfans 新刊1號 會變成 1，
  // 跟該刊真正的第 1 期撞在一起。
  it("does not pull a number out of a longer name", () => {
    expect(issueSlugify("GAMEfans 新刊1號")).toBe("gamefans-新刊1號");
  });
});
