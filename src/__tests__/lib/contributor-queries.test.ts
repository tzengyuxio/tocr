/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import {
  countRecentEdits,
  getContributorLeaderboard,
} from "@/lib/contributor-queries";

beforeEach(() => {
  resetPrismaMock();
  prismaMock.editLog.count.mockResolvedValue(0);
  prismaMock.editLog.groupBy.mockResolvedValue([]);
});

// Renaming yourself writes an edit log, and so does an admin granting a role.
// Both are real edits and both stay in the audit log, but neither is work on
// the catalogue, so neither should earn a contribution.
describe("contribution counts leave account changes out", () => {
  it("excludes User edits from the recent count", async () => {
    await countRecentEdits(7);

    expect(prismaMock.editLog.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ entityType: { not: "User" } }),
    });
  });

  it("excludes User edits from the leaderboard", async () => {
    await getContributorLeaderboard();

    const [call] = prismaMock.editLog.groupBy.mock.calls[0];
    expect(call.where).toEqual(
      expect.objectContaining({ entityType: { not: "User" } })
    );
  });

  it("still excludes the import script", async () => {
    await getContributorLeaderboard();

    const [call] = prismaMock.editLog.groupBy.mock.calls[0];
    expect(call.where.userId).toEqual({ notIn: ["api-token"] });
  });

  it("keeps the period filter alongside the entity filter", async () => {
    await getContributorLeaderboard({ period: "week" });

    const [call] = prismaMock.editLog.groupBy.mock.calls[0];
    expect(call.where.entityType).toEqual({ not: "User" });
    expect(call.where.createdAt.gte).toBeInstanceOf(Date);
  });
});
