/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { resolveIssueParam, resolveSlugParam } from "@/lib/slug-lookup";

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

  // 期刊 slug 是 ASCII，但走的是同一條「先 slug 後 cuid」的路。
  it("resolves a magazine by slug", async () => {
    prismaMock.magazine.findUnique.mockResolvedValueOnce({ id: "m1", slug: "ace" });

    expect(await resolveSlugParam("magazine", "ace")).toEqual({
      id: "m1",
      slug: "ace",
    });
    expect(prismaMock.magazine.findUnique).toHaveBeenCalledTimes(1);
  });

  // 改過網址代號之後，舊代號要轉到現行那條——回傳的是現行 slug，呼叫端既有的
  // `param !== found.slug` 判斷就會發出轉址。
  it("resolves a retired magazine slug to the current one", async () => {
    prismaMock.magazine.findUnique.mockResolvedValueOnce(null);
    prismaMock.magazineSlug.findUnique.mockResolvedValueOnce({
      magazine: { id: "m1", slug: "swm" },
    });

    expect(await resolveSlugParam("magazine", "soft-world")).toEqual({
      id: "m1",
      slug: "swm",
    });
  });

  // 現行代號優先於退役代號：兩者撞名時（`MagazineSlug.slug` 的 @unique 讓這在
  // 資料層不可能，但查詢順序是同一道保險的另一半）不能轉到被退掉的那本。
  it("prefers a current magazine slug over a retired one", async () => {
    prismaMock.magazine.findUnique.mockResolvedValueOnce({ id: "m2", slug: "swm" });

    expect(await resolveSlugParam("magazine", "swm")).toEqual({
      id: "m2",
      slug: "swm",
    });
    expect(prismaMock.magazineSlug.findUnique).not.toHaveBeenCalled();
  });

  it("falls back to the cuid for a magazine", async () => {
    prismaMock.magazine.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "m1", slug: "ace" });
    prismaMock.magazineSlug.findUnique.mockResolvedValueOnce(null);

    expect(await resolveSlugParam("magazine", "m1")).toEqual({
      id: "m1",
      slug: "ace",
    });
  });

  it("returns null when neither matches", async () => {
    prismaMock.tag.findUnique.mockResolvedValue(null);

    expect(await resolveSlugParam("tag", "nope")).toBeNull();
  });
});

// 單期只在該刊內唯一，所以三段查詢都綁著 magazineId。
describe("resolveIssueParam", () => {
  it("matches on slug first", async () => {
    prismaMock.issue.findUnique.mockResolvedValueOnce({ id: "i1", slug: "105" });

    expect(await resolveIssueParam("m1", "105")).toEqual({ id: "i1", slug: "105" });
    expect(prismaMock.issue.findUnique).toHaveBeenCalledWith({
      where: { magazineId_slug: { magazineId: "m1", slug: "105" } },
      select: { id: true, slug: true },
    });
  });

  // 拿著實體雜誌的人讀到的是封底印的期號，那跟網址上的 slug 可以是兩回事。
  it("falls back to the issue number as printed", async () => {
    prismaMock.issue.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "i1", slug: "2014-01-30" });

    expect(await resolveIssueParam("m1", "468")).toEqual({
      id: "i1",
      slug: "2014-01-30",
    });
    expect(prismaMock.issue.findUnique).toHaveBeenLastCalledWith({
      where: { magazineId_issueNumber: { magazineId: "m1", issueNumber: "468" } },
      select: { id: true, slug: true },
    });
  });

  it("falls back to the cuid, scoped to the magazine", async () => {
    prismaMock.issue.findUnique.mockResolvedValue(null);
    prismaMock.issue.findFirst.mockResolvedValueOnce({ id: "i1", slug: "105" });

    expect(await resolveIssueParam("m1", "i1")).toEqual({ id: "i1", slug: "105" });
    expect(prismaMock.issue.findFirst).toHaveBeenCalledWith({
      where: { id: "i1", magazineId: "m1" },
      select: { id: true, slug: true },
    });
  });

  // 中文 slug（創刊號）在網址上是 percent-encoded。
  it("decodes the param before looking it up", async () => {
    prismaMock.issue.findUnique.mockResolvedValueOnce({ id: "i1", slug: "創刊號" });

    await resolveIssueParam("m1", "%E5%89%B5%E5%88%8A%E8%99%9F");

    expect(prismaMock.issue.findUnique).toHaveBeenCalledWith({
      where: { magazineId_slug: { magazineId: "m1", slug: "創刊號" } },
      select: { id: true, slug: true },
    });
  });

  it("returns null when nothing matches", async () => {
    prismaMock.issue.findUnique.mockResolvedValue(null);
    prismaMock.issue.findFirst.mockResolvedValue(null);

    expect(await resolveIssueParam("m1", "nope")).toBeNull();
  });
});
