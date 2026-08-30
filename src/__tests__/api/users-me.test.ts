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
  prismaMock.$queryRaw.mockResolvedValue([]);
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
    prismaMock.$queryRaw.mockResolvedValue([{ id: "user-2" }]);

    const response = await PATCH(requestWith({ name: "cloudy chen" }));

    expect(response.status).toBe(409);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  // The lookup is read-then-write, so it cannot stop two people submitting the
  // same name at once. users_name_lower_key can, and the route has to turn that
  // into the same 409 rather than a 500.
  it("refuses a name that was taken between the lookup and the write", async () => {
    const clash = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
    });
    prismaMock.user.update.mockRejectedValue(clash);

    const response = await PATCH(requestWith({ name: "cloudy chen" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("這個顯示名稱已經有人使用了");
  });

  // lower() on both sides rather than ILIKE, which would read % and _ in the
  // submitted name as wildcards and claim a free name was taken.
  it("compares names case-insensitively without pattern matching", async () => {
    await PATCH(requestWith({ name: "100%_愛" }));

    const [fragments, ...values] = prismaMock.$queryRaw.mock.calls[0];
    expect(fragments.join("?")).toContain("lower(name) = lower(");
    expect(fragments.join("?")).not.toContain("ILIKE");
    expect(values).toEqual(["100%_愛", "user-1"]);
  });

  it("rejects a blank name before touching the database", async () => {
    const response = await PATCH(requestWith({ name: "   " }));

    expect(response.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  // withErrorHandler would flatten a ZodError into "Validation failed", which
  // says nothing about which rule the name broke.
  it("returns the reason the name was rejected", async () => {
    const response = await PATCH(requestWith({ name: "司書(NPC)" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("這個名稱是系統保留的");
  });

  it("explains a name that is too long", async () => {
    const response = await PATCH(requestWith({ name: "字".repeat(31) }));
    const body = await response.json();

    expect(body.error).toContain("30");
  });

  it("records the rename in the edit log", async () => {
    await PATCH(requestWith({ name: "新名字" }));

    expect(logEditMock).toHaveBeenCalledWith("User", "user-1", "UPDATE", {
      name: { from: "舊名字", to: "新名字" },
    });
  });
});
