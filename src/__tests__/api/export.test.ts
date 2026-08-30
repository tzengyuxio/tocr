/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { GET } from "@/app/api/export/route";
import { NextRequest } from "next/server";

beforeEach(() => {
  resetPrismaMock();
  prismaMock.exportLog.create.mockResolvedValue({ id: "log-1" });
  prismaMock.exportLog.update.mockResolvedValue({});
});

function makeRequest(query = "") {
  return new NextRequest(
    new URL(`http://localhost:3000/api/export${query}`),
    { headers: { "user-agent": "jest" } }
  );
}

/** Drain the CSV so the stream reaches its end and closes the log. */
async function drain(response: Response) {
  const text = await response.text();
  return text.split("\r\n").filter(Boolean);
}

// The shape the route's own select asks for, so a column added to one and not
// the other shows up here rather than as a truncated download.
const magazine = {
  id: "mag-1",
  name: "電腦玩家",
  slug: "acer-pc-gamer",
  nameParallel: null,
  sourceTitle: null,
  aliases: [],
  publisher: "第三波",
  issn: null,
  description: null,
  categories: [],
  foundedDate: null,
  endedDate: null,
  isActive: true,
  logoImage: null,
  photos: [],
};

describe("GET /api/export", () => {
  it("records the export and fills in the row count", async () => {
    prismaMock.magazine.findMany.mockResolvedValue([magazine]);
    prismaMock.issue.findMany.mockResolvedValue([]);

    const lines = await drain(await GET(makeRequest(), undefined as never));

    expect(prismaMock.exportLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "test-user",
        magazineId: null,
        magazineName: null,
        userAgent: "jest",
      }),
    });
    // Header plus the magazine's own row -- a magazine with no issues still
    // gets one line.
    expect(prismaMock.exportLog.update).toHaveBeenCalledWith({
      where: { id: "log-1" },
      data: { rowCount: lines.length - 1 },
    });
  });

  it("records which magazine was exported", async () => {
    prismaMock.magazine.findMany.mockResolvedValue([magazine]);
    prismaMock.issue.findMany.mockResolvedValue([]);

    await drain(await GET(makeRequest("?magazineId=mag-1"), undefined as never));

    expect(prismaMock.exportLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        magazineId: "mag-1",
        magazineName: "電腦玩家",
      }),
    });
  });

  // rowCount staying null is the marker for an export that did not finish.
  it("leaves the row count unset when the stream dies", async () => {
    prismaMock.magazine.findMany.mockResolvedValue([magazine]);
    prismaMock.issue.findMany.mockRejectedValue(new Error("db down"));

    await expect(
      drain(await GET(makeRequest(), undefined as never))
    ).rejects.toThrow();

    expect(prismaMock.exportLog.create).toHaveBeenCalled();
    expect(prismaMock.exportLog.update).not.toHaveBeenCalled();
  });
});
