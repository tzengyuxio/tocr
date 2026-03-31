/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { POST } from "@/app/api/articles/batch/route";
import { NextRequest } from "next/server";

beforeEach(() => {
  resetPrismaMock();
});

function makeRequest(body: object) {
  return new NextRequest(
    new URL("http://localhost:3000/api/articles/batch"),
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

describe("POST /api/articles/batch", () => {
  it("creates articles in batch for existing issue", async () => {
    prismaMock.issue.findUnique.mockResolvedValue({ id: "iss-1" });
    prismaMock.article.create.mockResolvedValue({
      id: "art-1",
      title: "Review: Final Fantasy XVI",
      issueId: "iss-1",
    });

    const res = await POST(
      makeRequest({
        issueId: "iss-1",
        articles: [
          {
            title: "Review: Final Fantasy XVI",
            authors: ["Author A"],
            pageStart: 10,
            pageEnd: 15,
          },
        ],
      })
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.count).toBe(1);
  });

  it("returns 404 when issue does not exist", async () => {
    prismaMock.issue.findUnique.mockResolvedValue(null);

    const res = await POST(
      makeRequest({
        issueId: "nonexistent",
        articles: [{ title: "Test Article" }],
      })
    );

    expect(res.status).toBe(404);
  });

  it("returns 400 for missing issueId", async () => {
    const res = await POST(
      makeRequest({
        articles: [{ title: "Test" }],
      })
    );

    expect(res.status).toBe(400);
  });

  it("creates zero articles when articles array is empty", async () => {
    prismaMock.issue.findUnique.mockResolvedValue({ id: "iss-1" });

    const res = await POST(
      makeRequest({
        issueId: "iss-1",
        articles: [],
      })
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.count).toBe(0);
  });

  it("creates game associations when suggestedGames provided", async () => {
    prismaMock.issue.findUnique.mockResolvedValue({ id: "iss-1" });
    prismaMock.article.create.mockResolvedValue({
      id: "art-1",
      title: "Test",
      issueId: "iss-1",
    });
    // Game not found, will be created
    prismaMock.game.findFirst.mockResolvedValue(null);
    prismaMock.game.create.mockResolvedValue({
      id: "game-1",
      name: "Zelda",
      slug: "zelda",
    });
    prismaMock.articleGame.create.mockResolvedValue({
      id: "ag-1",
      articleId: "art-1",
      gameId: "game-1",
    });

    const res = await POST(
      makeRequest({
        issueId: "iss-1",
        articles: [
          {
            title: "Zelda Review",
            suggestedGames: ["Zelda"],
          },
        ],
      })
    );

    expect(res.status).toBe(201);
    expect(prismaMock.game.create).toHaveBeenCalled();
    expect(prismaMock.articleGame.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isPrimary: true,
        }),
      })
    );
  });

  it("creates tag associations when suggestedTags provided", async () => {
    prismaMock.issue.findUnique.mockResolvedValue({ id: "iss-1" });
    prismaMock.article.create.mockResolvedValue({
      id: "art-1",
      title: "Test",
      issueId: "iss-1",
    });
    prismaMock.tag.findFirst.mockResolvedValue(null);
    prismaMock.tag.create.mockResolvedValue({
      id: "tag-1",
      name: "RPG",
      slug: "rpg",
      type: "GENERAL",
    });
    prismaMock.articleTag.create.mockResolvedValue({
      id: "at-1",
      articleId: "art-1",
      tagId: "tag-1",
    });

    const res = await POST(
      makeRequest({
        issueId: "iss-1",
        articles: [
          {
            title: "RPG Roundup",
            suggestedTags: [{ name: "RPG", type: "GENERAL" }],
          },
        ],
      })
    );

    expect(res.status).toBe(201);
    expect(prismaMock.tag.create).toHaveBeenCalled();
    expect(prismaMock.articleTag.create).toHaveBeenCalled();
  });

  it("reuses existing game when found by name", async () => {
    prismaMock.issue.findUnique.mockResolvedValue({ id: "iss-1" });
    prismaMock.article.create.mockResolvedValue({
      id: "art-1",
      title: "Test",
      issueId: "iss-1",
    });
    prismaMock.game.findFirst.mockResolvedValue({
      id: "existing-game",
      name: "Zelda",
      slug: "zelda",
    });
    prismaMock.articleGame.create.mockResolvedValue({
      id: "ag-1",
      articleId: "art-1",
      gameId: "existing-game",
    });

    const res = await POST(
      makeRequest({
        issueId: "iss-1",
        articles: [
          {
            title: "Zelda Guide",
            suggestedGames: ["Zelda"],
          },
        ],
      })
    );

    expect(res.status).toBe(201);
    expect(prismaMock.game.create).not.toHaveBeenCalled();
    expect(prismaMock.articleGame.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          gameId: "existing-game",
        }),
      })
    );
  });
});
