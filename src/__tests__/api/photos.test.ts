/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { POST } from "@/app/api/photos/route";
import { DELETE, PATCH } from "@/app/api/photos/[id]/route";
import { PUT } from "@/app/api/photos/reorder/route";
import { makeRequest } from "../helpers";

const context = (id: string) => ({ params: Promise.resolve({ id }) });

function post(body: unknown) {
  return POST(
    makeRequest("http://localhost:3000/api/photos", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  resetPrismaMock();
});

describe("POST /api/photos", () => {
  it("hangs the photo off the magazine and puts it after the existing ones", async () => {
    prismaMock.photo.findFirst.mockResolvedValue({ order: 2 });
    prismaMock.photo.create.mockResolvedValue({ id: "p1", url: "u", magazineId: "m1" });

    const res = await post({ magazineId: "m1", url: "https://blob.test/a.webp" });

    expect(res.status).toBe(201);
    expect(prismaMock.photo.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ magazineId: "m1", order: 3 }),
    });
  });

  it("starts at 0 when the magazine has no photos yet", async () => {
    prismaMock.photo.findFirst.mockResolvedValue(null);
    prismaMock.photo.create.mockResolvedValue({ id: "p1" });

    await post({ issueId: "i1", url: "https://blob.test/a.webp" });

    expect(prismaMock.photo.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ issueId: "i1", order: 0 }),
    });
  });

  // 二擇一。資料庫的 photos_one_owner 也擋得住，但那只回得了一句約束違反。
  it("refuses a photo that hangs off both a magazine and an issue", async () => {
    const res = await post({ magazineId: "m1", issueId: "i1", url: "u" });

    expect(res.status).toBe(400);
    expect(prismaMock.photo.create).not.toHaveBeenCalled();
  });

  it("refuses a photo that hangs off neither", async () => {
    const res = await post({ url: "u" });

    expect(res.status).toBe(400);
    expect(prismaMock.photo.create).not.toHaveBeenCalled();
  });

  // 新上傳的多半來路還沒確認：預設藏起來，由編輯按眼睛放出來。
  it("defaults to not public", async () => {
    prismaMock.photo.findFirst.mockResolvedValue(null);
    prismaMock.photo.create.mockResolvedValue({ id: "p1" });

    await post({ magazineId: "m1", url: "https://blob.test/a.webp" });

    expect(prismaMock.photo.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ isPublic: false }),
    });
  });
});

describe("PATCH /api/photos/[id]", () => {
  it("stores a blank caption as null rather than an empty string", async () => {
    prismaMock.photo.findUnique.mockResolvedValue({ id: "p1", caption: "舊說明" });
    prismaMock.photo.update.mockResolvedValue({ id: "p1", caption: null });

    await PATCH(
      makeRequest("http://localhost:3000/api/photos/p1", {
        method: "PATCH",
        body: JSON.stringify({ caption: "" }),
      }),
      context("p1")
    );

    expect(prismaMock.photo.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { caption: null },
    });
  });

  // 改掛點等於換一張圖的身分，現場沒有這個動作。
  it("ignores an attempt to move the photo to another owner", async () => {
    prismaMock.photo.findUnique.mockResolvedValue({ id: "p1", magazineId: "m1" });
    prismaMock.photo.update.mockResolvedValue({ id: "p1" });

    await PATCH(
      makeRequest("http://localhost:3000/api/photos/p1", {
        method: "PATCH",
        body: JSON.stringify({ magazineId: "m2", isPublic: true }),
      }),
      context("p1")
    );

    expect(prismaMock.photo.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { isPublic: true },
    });
  });
});

describe("PUT /api/photos/reorder", () => {
  it("numbers the photos by their position in the list", async () => {
    prismaMock.photo.update.mockResolvedValue({});

    const res = await PUT(
      makeRequest("http://localhost:3000/api/photos/reorder", {
        method: "PUT",
        body: JSON.stringify({ photoIds: ["c", "a", "b"] }),
      })
    );

    expect(res.status).toBe(200);
    expect(prismaMock.photo.update).toHaveBeenNthCalledWith(1, {
      where: { id: "c" },
      data: { order: 0 },
    });
    expect(prismaMock.photo.update).toHaveBeenNthCalledWith(3, {
      where: { id: "b" },
      data: { order: 2 },
    });
  });
});

describe("DELETE /api/photos/[id]", () => {
  it("deletes the row", async () => {
    prismaMock.photo.delete.mockResolvedValue({ id: "p1", url: "https://blob.test/a.webp" });

    const res = await DELETE(
      makeRequest("http://localhost:3000/api/photos/p1", { method: "DELETE" }),
      context("p1")
    );

    expect(res.status).toBe(200);
    expect(prismaMock.photo.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});
