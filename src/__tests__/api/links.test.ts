/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { POST } from "@/app/api/links/route";
import { DELETE, PATCH } from "@/app/api/links/[id]/route";
import { PUT } from "@/app/api/links/reorder/route";
import { makeRequest } from "../helpers";

const context = (id: string) => ({ params: Promise.resolve({ id }) });
const IA = "https://archive.org/details/example";

function post(body: unknown) {
  return POST(
    makeRequest("http://localhost:3000/api/links", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  resetPrismaMock();
});

const CDG = "https://cdosgame.simagame.me/games/cdg-0212";

describe("POST /api/links", () => {
  it("hangs the link off the issue and puts it after the existing ones", async () => {
    prismaMock.externalLink.findFirst.mockResolvedValue({ order: 1 });
    prismaMock.externalLink.create.mockResolvedValue({ id: "l1", url: IA });

    const res = await post({ issueId: "i1", site: "INTERNET_ARCHIVE", url: IA });

    expect(res.status).toBe(201);
    expect(prismaMock.externalLink.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ issueId: "i1", site: "INTERNET_ARCHIVE", order: 2 }),
    });
  });

  it("hangs the link off a game", async () => {
    prismaMock.externalLink.findFirst.mockResolvedValue(null);
    prismaMock.externalLink.create.mockResolvedValue({ id: "l1", url: CDG });

    const res = await post({ gameId: "g1", site: "CDOSGAME", url: CDG });

    expect(res.status).toBe(201);
    expect(prismaMock.externalLink.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ gameId: "g1", site: "CDOSGAME", order: 0 }),
    });
    // The ordering query has to look at that game's links, not every link with
    // a null magazine and issue.
    expect(prismaMock.externalLink.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { gameId: "g1" } })
    );
  });

  it("refuses a link that hangs off a game and an issue at once", async () => {
    const res = await post({ gameId: "g1", issueId: "i1", site: "WIKIPEDIA", url: CDG });

    expect(res.status).toBe(400);
    expect(prismaMock.externalLink.create).not.toHaveBeenCalled();
  });

  it("refuses a link with no owner at all", async () => {
    const res = await post({ site: "WIKIPEDIA", url: CDG });

    expect(res.status).toBe(400);
    expect(prismaMock.externalLink.create).not.toHaveBeenCalled();
  });

  it("refuses a link that hangs off both a magazine and an issue", async () => {
    const res = await post({ magazineId: "m1", issueId: "i1", site: "NCL", url: IA });

    expect(res.status).toBe(400);
    expect(prismaMock.externalLink.create).not.toHaveBeenCalled();
  });

  // 這一欄會變成公開頁上可點的連結。
  it("refuses a url that is not http(s)", async () => {
    const res = await post({ issueId: "i1", site: "OTHER", label: "x", url: "javascript:alert(1)" });

    expect(res.status).toBe(400);
    expect(prismaMock.externalLink.create).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/links/[id]", () => {
  it("stores a blank label as null rather than an empty string", async () => {
    prismaMock.externalLink.findUnique.mockResolvedValue({ id: "l1", label: "舊名字" });
    prismaMock.externalLink.update.mockResolvedValue({ id: "l1", label: null });

    await PATCH(
      makeRequest("http://localhost:3000/api/links/l1", {
        method: "PATCH",
        body: JSON.stringify({ label: "" }),
      }),
      context("l1")
    );

    expect(prismaMock.externalLink.update).toHaveBeenCalledWith({
      where: { id: "l1" },
      data: { label: null },
    });
  });
});

describe("PUT /api/links/reorder", () => {
  it("numbers the links by their position in the list", async () => {
    prismaMock.externalLink.update.mockResolvedValue({});

    const res = await PUT(
      makeRequest("http://localhost:3000/api/links/reorder", {
        method: "PUT",
        body: JSON.stringify({ linkIds: ["b", "a"] }),
      })
    );

    expect(res.status).toBe(200);
    expect(prismaMock.externalLink.update).toHaveBeenNthCalledWith(1, {
      where: { id: "b" },
      data: { order: 0 },
    });
  });
});

describe("DELETE /api/links/[id]", () => {
  it("deletes the row", async () => {
    prismaMock.externalLink.delete.mockResolvedValue({ id: "l1", url: IA });

    const res = await DELETE(
      makeRequest("http://localhost:3000/api/links/l1", { method: "DELETE" }),
      context("l1")
    );

    expect(res.status).toBe(200);
    expect(prismaMock.externalLink.delete).toHaveBeenCalledWith({ where: { id: "l1" } });
  });
});
