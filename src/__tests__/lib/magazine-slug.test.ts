/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { isRetiredByAnother, recordSlugChange } from "@/lib/magazine-slug";

beforeEach(() => resetPrismaMock());

// 退役的代號同時是佔位。少了這道檢查，新刊可以撿走 swm，於是所有指著舊 swm 的
// 連結會安靜地轉到錯的雜誌——比 404 還糟，因為看起來像成功了。
describe("isRetiredByAnother", () => {
  it("blocks a slug another magazine retired", async () => {
    prismaMock.magazineSlug.findUnique.mockResolvedValueOnce({ magazineId: "m1" });

    expect(await isRetiredByAnother(prismaMock as never, "swm", "m2")).toBe(true);
  });

  // 改名改回去是常見的反悔，自己用過的名字要拿得回來。
  it("allows a magazine to take back its own retired slug", async () => {
    prismaMock.magazineSlug.findUnique.mockResolvedValueOnce({ magazineId: "m1" });

    expect(await isRetiredByAnother(prismaMock as never, "swm", "m1")).toBe(false);
  });

  it("allows a slug nobody has retired", async () => {
    prismaMock.magazineSlug.findUnique.mockResolvedValueOnce(null);

    expect(await isRetiredByAnother(prismaMock as never, "swm", "m2")).toBe(false);
  });

  // 新增雜誌時沒有 id 可比，任何退役過的代號都該擋下。
  it("blocks a retired slug when there is no magazine yet", async () => {
    prismaMock.magazineSlug.findUnique.mockResolvedValueOnce({ magazineId: "m1" });

    expect(await isRetiredByAnother(prismaMock as never, "swm")).toBe(true);
  });
});

describe("recordSlugChange", () => {
  it("retires the old slug", async () => {
    await recordSlugChange(prismaMock as never, "m1", "soft-world", "swm");

    expect(prismaMock.magazineSlug.create).toHaveBeenCalledWith({
      data: { magazineId: "m1", slug: "soft-world" },
    });
  });

  // A -> B -> A：同一個代號不能同時是現行的又是退役的，否則轉址查詢有兩個答案。
  it("frees the new slug from its own history", async () => {
    await recordSlugChange(prismaMock as never, "m1", "swm", "soft-world");

    expect(prismaMock.magazineSlug.deleteMany).toHaveBeenCalledWith({
      where: { slug: "soft-world", magazineId: "m1" },
    });
  });
});
