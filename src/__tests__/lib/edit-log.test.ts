/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    editLog: { create: jest.fn(), createMany: jest.fn() },
    user: { upsert: jest.fn() },
  },
}));

// Never reached under the dev bypass below, but both modules are imported at
// load time and neither can be constructed in a test process.
jest.mock("@/lib/auth", () => ({ auth: jest.fn().mockResolvedValue(null) }));
jest.mock("next/headers", () => ({ headers: jest.fn() }));

jest.mock("@/lib/dev-auth", () => ({
  isDevBypass: true,
  DEV_USER: { id: "dev-user", email: "dev@localhost", name: "Dev", role: "ADMIN" },
}));

import { prisma } from "@/lib/prisma";

const editLogMock = prisma.editLog as unknown as {
  create: jest.Mock;
  createMany: jest.Mock;
};
const userMock = prisma.user as unknown as { upsert: jest.Mock };

import { logEdit, logEditBatch } from "@/lib/edit-log";

beforeEach(() => {
  editLogMock.create.mockReset().mockResolvedValue({ id: "log-1" });
  editLogMock.createMany.mockReset().mockResolvedValue({ count: 3 });
  userMock.upsert.mockReset().mockResolvedValue({ id: "dev-user" });
});

describe("logEdit", () => {
  // The write used to be left running after the function returned, which on a
  // serverless platform means it can be frozen before it reaches the database.
  it("has written the row by the time it resolves", async () => {
    await logEdit("Article", "art-1", "CREATE");

    expect(editLogMock.create).toHaveBeenCalledTimes(1);
  });

  // A save that wrote nothing is not history: it reads as an edit in the feed
  // and in the contributor counts while naming no field anyone changed.
  it("writes nothing for an UPDATE that changed no field", async () => {
    await logEdit("Game", "game-1", "UPDATE", {});

    expect(editLogMock.create).not.toHaveBeenCalled();
  });

  it("still records an UPDATE that changed something", async () => {
    await logEdit("Game", "game-1", "UPDATE", { name: { from: "a", to: "b" } });

    expect(editLogMock.create).toHaveBeenCalledTimes(1);
  });

  // CREATE and DELETE say something on their own; only UPDATE needs a field.
  it("still records a CREATE with no diff", async () => {
    await logEdit("Game", "game-1", "CREATE", {});

    expect(editLogMock.create).toHaveBeenCalledTimes(1);
  });

  it("does not fail the edit when the log write fails", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    editLogMock.create.mockRejectedValue(new Error("connection lost"));

    await expect(logEdit("Article", "art-1", "CREATE")).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});

describe("logEditBatch", () => {
  it("has written every row by the time it resolves", async () => {
    await logEditBatch("Article", ["a", "b", "c"], "CREATE");

    expect(editLogMock.createMany).toHaveBeenCalledTimes(1);
    const rows = editLogMock.createMany.mock.calls[0][0].data;
    expect(rows).toHaveLength(3);
    expect(rows.map((row: { batchSize: number | null }) => row.batchSize)).toEqual([
      3,
      null,
      null,
    ]);
    expect(new Set(rows.map((row: { batchId: string }) => row.batchId)).size).toBe(1);
  });

  it("writes nothing when there is nothing to log", async () => {
    await logEditBatch("Article", [], "CREATE");

    expect(editLogMock.createMany).not.toHaveBeenCalled();
  });
});
