/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { resolveEditLogTargets } from "@/lib/edit-log-targets";

beforeEach(() => {
  resetPrismaMock();
});

describe("resolveEditLogTargets", () => {
  it("names magazines, issues and articles with links to their admin pages", async () => {
    prismaMock.magazine.findMany.mockResolvedValue([{ id: "m1", name: "電腦玩家" }]);
    prismaMock.issue.findMany.mockResolvedValue([
      {
        id: "i1",
        issueNumber: "第 42 期",
        magazine: { id: "m1", name: "電腦玩家" },
      },
    ]);
    prismaMock.article.findMany.mockResolvedValue([
      { id: "a1", title: "太空戰士 VII 攻略" },
    ]);

    const targetOf = await resolveEditLogTargets([
      { entityType: "Magazine", entityId: "m1" },
      { entityType: "Issue", entityId: "i1" },
      { entityType: "Article", entityId: "a1" },
    ]);

    expect(targetOf({ entityType: "Magazine", entityId: "m1" })).toEqual({
      label: "電腦玩家",
      href: "/admin/magazines/m1",
    });
    expect(targetOf({ entityType: "Issue", entityId: "i1" })).toEqual({
      label: "電腦玩家 第 42 期",
      href: "/admin/magazines/m1/issues/i1",
    });
    expect(targetOf({ entityType: "Article", entityId: "a1" })).toEqual({
      label: "太空戰士 VII 攻略",
      href: "/admin/articles/a1",
    });
  });

  it("queries once per entity type, not once per log", async () => {
    prismaMock.issue.findMany.mockResolvedValue([
      { id: "i1", issueNumber: "1", magazine: { id: "m1", name: "A" } },
      { id: "i2", issueNumber: "2", magazine: { id: "m1", name: "A" } },
    ]);

    await resolveEditLogTargets([
      { entityType: "Issue", entityId: "i1" },
      { entityType: "Issue", entityId: "i2" },
      { entityType: "Issue", entityId: "i1" },
    ]);

    expect(prismaMock.issue.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.issue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["i1", "i2"] } } })
    );
  });

  it("keeps the id visible when the record is gone, so the log stays traceable", async () => {
    prismaMock.game.findMany.mockResolvedValue([]);

    const targetOf = await resolveEditLogTargets([
      { entityType: "Game", entityId: "g-gone" },
    ]);

    expect(targetOf({ entityType: "Game", entityId: "g-gone" })).toEqual({
      label: "（已刪除 · g-gone）",
      href: null,
    });
  });

  it("hides who a user account belongs to unless the caller asks", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: "u1", name: null, email: "someone@example.com" },
    ]);

    const masked = await resolveEditLogTargets([
      { entityType: "User", entityId: "u1" },
    ]);

    expect(masked({ entityType: "User", entityId: "u1" })).toEqual({
      label: "（僅管理員可見）",
      href: null,
    });
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();

    const revealed = await resolveEditLogTargets(
      [{ entityType: "User", entityId: "u1" }],
      { revealUsers: true }
    );

    expect(revealed({ entityType: "User", entityId: "u1" })).toEqual({
      label: "someone@example.com",
      href: null,
    });
  });

  it("skips logs with no entity id and unknown entity types", async () => {
    const targetOf = await resolveEditLogTargets([
      { entityType: "Article", entityId: "" },
      { entityType: "Mystery", entityId: "x1" },
    ]);

    expect(prismaMock.article.findMany).not.toHaveBeenCalled();
    expect(targetOf({ entityType: "Article", entityId: "" })).toEqual({
      label: "（已刪除）",
      href: null,
    });
    expect(targetOf({ entityType: "Mystery", entityId: "x1" })).toEqual({
      label: "（已刪除 · x1）",
      href: null,
    });
  });
});
