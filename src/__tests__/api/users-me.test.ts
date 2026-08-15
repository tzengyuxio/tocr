/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";

jest.mock("@/lib/edit-log", () => ({
  getCurrentUserId: jest.fn(),
  logEdit: jest.fn().mockResolvedValue(undefined),
}));

import { PATCH } from "@/app/api/users/me/route";
import { getCurrentUserId, logEdit } from "@/lib/edit-log";
import { NextRequest } from "next/server";

const currentUser = getCurrentUserId as jest.Mock;
const logEditMock = logEdit as jest.Mock;

function requestWith(body: unknown) {
  return new NextRequest("http://localhost:3000/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  resetPrismaMock();
  currentUser.mockReset().mockResolvedValue("user-1");
  logEditMock.mockClear();
  prismaMock.user.findFirst.mockResolvedValue(null);
  prismaMock.user.findUnique.mockResolvedValue({ name: "舊名字" });
  prismaMock.user.update.mockResolvedValue({
    id: "user-1",
    name: "新名字",
    email: "a@example.com",
    image: null,
    role: "EDITOR",
  });
});

describe("PATCH /api/users/me", () => {
  it("renames the caller", async () => {
    const response = await PATCH(requestWith({ name: "新名字" }));

    expect(response.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { name: "新名字" },
      })
    );
  });

  it("refuses a caller with no session", async () => {
    currentUser.mockResolvedValue(null);

    const response = await PATCH(requestWith({ name: "新名字" }));

    expect(response.status).toBe(401);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  // ensureUser rewrites these names on every edit, so a change would not last.
  it("refuses the synthetic accounts", async () => {
    currentUser.mockResolvedValue("api-token");

    const response = await PATCH(requestWith({ name: "假的司書" }));

    expect(response.status).toBe(403);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("refuses a name another user already has", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "user-2" });

    const response = await PATCH(requestWith({ name: "cloudy chen" }));

    expect(response.status).toBe(409);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("compares names without regard to case", async () => {
    await PATCH(requestWith({ name: "Cloudy Chen" }));

    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { equals: "Cloudy Chen", mode: "insensitive" },
          NOT: { id: "user-1" },
        }),
      })
    );
  });

  it("rejects a blank name before touching the database", async () => {
    const response = await PATCH(requestWith({ name: "   " }));

    expect(response.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("records the rename in the edit log", async () => {
    await PATCH(requestWith({ name: "新名字" }));

    expect(logEditMock).toHaveBeenCalledWith("User", "user-1", "UPDATE", {
      name: { from: "舊名字", to: "新名字" },
    });
  });
});
