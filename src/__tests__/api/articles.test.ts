/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { GET, POST } from "@/app/api/articles/route";
import { makeRequest } from "../helpers";

beforeEach(() => {
  resetPrismaMock();
});

describe("GET /api/articles", () => {
  it("returns paginated articles", async () => {
    const articles = [
      {
        id: "art-1",
        title: "Test Article",
        issue: { id: "iss-1", issueNumber: "No.1", publishDate: new Date(), magazine: { id: "m1", name: "Mag" } },
        articleGames: [],
        articleTags: [],
      },
    ];
    prismaMock.article.findMany.mockResolvedValue(articles);
    prismaMock.article.count.mockResolvedValue(1);

    const res = await GET(makeRequest("http://localhost:3000/api/articles"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.pagination.total).toBe(1);
  });

  it("filters by issueId", async () => {
    prismaMock.article.findMany.mockResolvedValue([]);
    prismaMock.article.count.mockResolvedValue(0);

    await GET(makeRequest("http://localhost:3000/api/articles?issueId=iss-1"));

    expect(prismaMock.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ issueId: "iss-1" }),
      })
    );
  });

  it("filters by gameId", async () => {
    prismaMock.article.findMany.mockResolvedValue([]);
    prismaMock.article.count.mockResolvedValue(0);

    await GET(makeRequest("http://localhost:3000/api/articles?gameId=g1"));

    expect(prismaMock.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          articleGames: { some: { gameId: "g1" } },
        }),
      })
    );
  });

  it("filters by tagId", async () => {
    prismaMock.article.findMany.mockResolvedValue([]);
    prismaMock.article.count.mockResolvedValue(0);

    await GET(makeRequest("http://localhost:3000/api/articles?tagId=t1"));

    expect(prismaMock.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          articleTags: { some: { tagId: "t1" } },
        }),
      })
    );
  });

  it("supports text search", async () => {
    prismaMock.article.findMany.mockResolvedValue([]);
    prismaMock.article.count.mockResolvedValue(0);

    await GET(makeRequest("http://localhost:3000/api/articles?search=勇者鬥惡龍"));

    expect(prismaMock.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ title: expect.objectContaining({ contains: "勇者鬥惡龍" }) }),
          ]),
        }),
      })
    );
  });
});

describe("POST /api/articles", () => {
  it("creates an article with valid data", async () => {
    const created = { id: "art-new", title: "New Article", issueId: "iss-1" };
    prismaMock.article.create.mockResolvedValue(created);

    const res = await POST(
      makeRequest("http://localhost:3000/api/articles", {
        method: "POST",
        body: JSON.stringify({
          title: "New Article",
          issueId: "iss-1",
        }),
      })
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.title).toBe("New Article");
  });

  it("returns 400 for missing title", async () => {
    const res = await POST(
      makeRequest("http://localhost:3000/api/articles", {
        method: "POST",
        body: JSON.stringify({ issueId: "iss-1" }),
      })
    );

    expect(res.status).toBe(400);
  });
});
