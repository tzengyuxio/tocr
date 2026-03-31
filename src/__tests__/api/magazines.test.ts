/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { GET, POST } from "@/app/api/magazines/route";
import { NextRequest } from "next/server";

beforeEach(() => {
  resetPrismaMock();
});

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("GET /api/magazines", () => {
  it("returns paginated magazines list", async () => {
    const magazines = [
      { id: "1", name: "電擊PlayStation", _count: { issues: 5 } },
      { id: "2", name: "Famitsu", _count: { issues: 10 } },
    ];
    prismaMock.magazine.findMany.mockResolvedValue(magazines);
    prismaMock.magazine.count.mockResolvedValue(2);

    const res = await GET(makeRequest("http://localhost:3000/api/magazines"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    });
  });

  it("supports search parameter", async () => {
    prismaMock.magazine.findMany.mockResolvedValue([]);
    prismaMock.magazine.count.mockResolvedValue(0);

    await GET(makeRequest("http://localhost:3000/api/magazines?search=電擊"));

    expect(prismaMock.magazine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ name: expect.objectContaining({ contains: "電擊" }) }),
          ]),
        }),
      })
    );
  });

  it("supports pagination parameters", async () => {
    prismaMock.magazine.findMany.mockResolvedValue([]);
    prismaMock.magazine.count.mockResolvedValue(50);

    const res = await GET(
      makeRequest("http://localhost:3000/api/magazines?page=3&limit=10")
    );
    const json = await res.json();

    expect(json.pagination).toEqual({
      page: 3,
      limit: 10,
      total: 50,
      totalPages: 5,
    });
    expect(prismaMock.magazine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      })
    );
  });

  it("returns 500 on database error", async () => {
    prismaMock.magazine.findMany.mockRejectedValue(new Error("DB down"));

    const res = await GET(makeRequest("http://localhost:3000/api/magazines"));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Failed to fetch magazines");
  });
});

describe("POST /api/magazines", () => {
  it("creates a magazine with valid data", async () => {
    const created = { id: "new-1", name: "Game Walker", isActive: true };
    prismaMock.magazine.create.mockResolvedValue(created);

    const res = await POST(
      makeRequest("http://localhost:3000/api/magazines", {
        method: "POST",
        body: JSON.stringify({ name: "Game Walker" }),
      })
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.name).toBe("Game Walker");
  });

  it("returns 400 for missing required fields", async () => {
    const res = await POST(
      makeRequest("http://localhost:3000/api/magazines", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 for empty name", async () => {
    const res = await POST(
      makeRequest("http://localhost:3000/api/magazines", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
      })
    );

    expect(res.status).toBe(400);
  });
});
