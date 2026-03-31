/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { GET, PUT, DELETE } from "@/app/api/magazines/[id]/route";
import { NextRequest } from "next/server";

beforeEach(() => {
  resetPrismaMock();
});

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/magazines/[id]", () => {
  it("returns magazine with issues", async () => {
    const magazine = {
      id: "mag-1",
      name: "Famitsu",
      issues: [{ id: "iss-1", issueNumber: "No.1" }],
      _count: { issues: 1 },
    };
    prismaMock.magazine.findUnique.mockResolvedValue(magazine);

    const res = await GET(
      makeRequest("http://localhost:3000/api/magazines/mag-1"),
      makeParams("mag-1")
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.name).toBe("Famitsu");
    expect(json.issues).toHaveLength(1);
  });

  it("returns 404 when not found", async () => {
    prismaMock.magazine.findUnique.mockResolvedValue(null);

    const res = await GET(
      makeRequest("http://localhost:3000/api/magazines/nonexistent"),
      makeParams("nonexistent")
    );

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/magazines/[id]", () => {
  it("updates magazine with valid data", async () => {
    const updated = { id: "mag-1", name: "Updated Name" };
    prismaMock.magazine.update.mockResolvedValue(updated);

    const res = await PUT(
      makeRequest("http://localhost:3000/api/magazines/mag-1", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Name" }),
      }),
      makeParams("mag-1")
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.name).toBe("Updated Name");
  });

  it("returns 400 for invalid data", async () => {
    const res = await PUT(
      makeRequest("http://localhost:3000/api/magazines/mag-1", {
        method: "PUT",
        body: JSON.stringify({ name: "" }),
      }),
      makeParams("mag-1")
    );

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/magazines/[id]", () => {
  it("deletes magazine successfully", async () => {
    prismaMock.magazine.delete.mockResolvedValue({ id: "mag-1" });

    const res = await DELETE(
      makeRequest("http://localhost:3000/api/magazines/mag-1", {
        method: "DELETE",
      }),
      makeParams("mag-1")
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns 500 when deletion fails", async () => {
    prismaMock.magazine.delete.mockRejectedValue(new Error("FK constraint"));

    const res = await DELETE(
      makeRequest("http://localhost:3000/api/magazines/mag-1", {
        method: "DELETE",
      }),
      makeParams("mag-1")
    );

    expect(res.status).toBe(500);
  });
});
