/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { finishExportLog, startExportLog } from "@/lib/export-log";
import { getCurrentUserId } from "@/lib/edit-log";

const mockedGetCurrentUserId = getCurrentUserId as jest.Mock;

function makeRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/export", { headers });
}

beforeEach(() => {
  resetPrismaMock();
  mockedGetCurrentUserId.mockResolvedValue("user-1");
  prismaMock.exportLog.create.mockResolvedValue({ id: "log-1" });
});

describe("startExportLog", () => {
  it("records who exported what, from where", async () => {
    const id = await startExportLog(
      makeRequest({
        "x-forwarded-for": "203.0.113.7, 70.41.3.18",
        "user-agent": "Mozilla/5.0",
      }),
      { magazineId: "mag-1", magazineName: "電腦玩家" }
    );

    expect(id).toBe("log-1");
    expect(prismaMock.exportLog.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        magazineId: "mag-1",
        magazineName: "電腦玩家",
        // The proxy chain appends; the first entry is the client.
        ipAddress: "203.0.113.7",
        userAgent: "Mozilla/5.0",
      },
    });
  });

  it("stores a null scope for a whole-catalogue export", async () => {
    await startExportLog(makeRequest(), { magazineId: null, magazineName: null });

    expect(prismaMock.exportLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ magazineId: null, magazineName: null }),
    });
  });

  // An export that cannot be attributed is still an export; refusing to serve
  // it would be a worse failure than a missing log line.
  it("skips the log when there is no user to attribute it to", async () => {
    mockedGetCurrentUserId.mockResolvedValue(null);

    const id = await startExportLog(makeRequest(), {
      magazineId: null,
      magazineName: null,
    });

    expect(id).toBeNull();
    expect(prismaMock.exportLog.create).not.toHaveBeenCalled();
  });

  it("does not let a logging failure break the export", async () => {
    prismaMock.exportLog.create.mockRejectedValue(new Error("db down"));

    await expect(
      startExportLog(makeRequest(), { magazineId: null, magazineName: null })
    ).resolves.toBeNull();
  });
});

describe("finishExportLog", () => {
  it("fills in the row count once the stream is done", async () => {
    prismaMock.exportLog.update.mockResolvedValue({});

    await finishExportLog("log-1", 549);

    expect(prismaMock.exportLog.update).toHaveBeenCalledWith({
      where: { id: "log-1" },
      data: { rowCount: 549 },
    });
  });

  // Left null on purpose: a log without a count is a export that never finished.
  it("does nothing when the export was never logged", async () => {
    await finishExportLog(null, 549);

    expect(prismaMock.exportLog.update).not.toHaveBeenCalled();
  });
});
