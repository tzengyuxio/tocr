/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { PUT } from "@/app/api/articles/[id]/route";
import { NextRequest } from "next/server";

beforeEach(() => {
  resetPrismaMock();
  prismaMock.article.findUnique.mockResolvedValue({
    id: "art-1",
    title: "舊標題",
    articleGames: [],
    articleTags: [],
  });
  prismaMock.article.update.mockResolvedValue({ id: "art-1", title: "新標題" });
  prismaMock.articleGame.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.articleGame.createMany.mockResolvedValue({ count: 1 });
  prismaMock.articleTag.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.articleTag.createMany.mockResolvedValue({ count: 1 });
});

function makeRequest(body: object) {
  return new NextRequest(new URL("http://localhost:3000/api/articles/art-1"), {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ id: "art-1" }) };

describe("PUT /api/articles/[id]", () => {
  it("resolves game names into associations, creating what is missing", async () => {
    prismaMock.game.findFirst.mockResolvedValue(null);
    prismaMock.game.create.mockResolvedValue({ id: "game-new" });

    const res = await PUT(makeRequest({ games: ["新遊戲"] }), context as never);

    expect(res.status).toBe(200);
    expect(prismaMock.articleGame.createMany).toHaveBeenCalledWith({
      data: [{ articleId: "art-1", gameId: "game-new", isPrimary: true }],
    });
  });

  it("resolves tag names into associations", async () => {
    prismaMock.tag.findFirst.mockResolvedValue({ id: "tag-1" });

    const res = await PUT(
      makeRequest({ tags: [{ name: "攻略", type: "GENERAL" }] }),
      context as never
    );

    expect(res.status).toBe(200);
    expect(prismaMock.articleTag.createMany).toHaveBeenCalledWith({
      data: [{ articleId: "art-1", tagId: "tag-1" }],
    });
  });

  it("clears the associations when given an empty list", async () => {
    await PUT(makeRequest({ games: [] }), context as never);

    expect(prismaMock.articleGame.deleteMany).toHaveBeenCalledWith({
      where: { articleId: "art-1" },
    });
    expect(prismaMock.articleGame.createMany).not.toHaveBeenCalled();
  });

  // Two ways to say the same thing, with different outcomes if they disagree.
  it("refuses ids and names in the same request", async () => {
    const res = await PUT(
      makeRequest({ games: ["A"], gameIds: ["game-1"] }),
      context as never
    );

    expect(res.status).toBe(400);
    expect(prismaMock.article.update).not.toHaveBeenCalled();
  });
});
