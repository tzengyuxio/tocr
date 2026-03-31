import { prisma } from "./prisma";

interface ContributorOptions {
  take?: number;
  skip?: number;
  period?: "week" | "month" | null;
  includeEmail?: boolean;
}

export interface ContributorEntry {
  rank: number;
  user: { id: string; name: string | null; email?: string; image: string | null };
  totalEdits: number;
  breakdown: Record<string, number>;
}

export async function getContributorLeaderboard(options: ContributorOptions = {}): Promise<{
  contributors: ContributorEntry[];
  totalContributors: number;
}> {
  const { take = 20, skip = 0, period, includeEmail = false } = options;

  const dateFilter: { gte?: Date } = {};
  if (period === "week") {
    dateFilter.gte = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "month") {
    dateFilter.gte = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }
  const where = dateFilter.gte ? { createdAt: dateFilter } : {};

  // First batch: editCounts + totalContributors in parallel
  const [editCounts, totalGroups] = await Promise.all([
    prisma.editLog.groupBy({
      by: ["userId"],
      where,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      skip,
      take,
    }),
    prisma.editLog.groupBy({
      by: ["userId"],
      where,
    }),
  ]);

  const totalContributors = totalGroups.length;
  const userIds = editCounts.map((e) => e.userId);

  if (userIds.length === 0) {
    return { contributors: [], totalContributors: 0 };
  }

  // Second batch: users + action breakdowns in parallel
  const [users, actionBreakdowns] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, ...(includeEmail && { email: true }), image: true },
    }),
    prisma.editLog.groupBy({
      by: ["userId", "action"],
      where: { ...where, userId: { in: userIds } },
      _count: { id: true },
    }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const breakdownMap = new Map<string, Record<string, number>>();
  for (const row of actionBreakdowns) {
    if (!breakdownMap.has(row.userId)) {
      breakdownMap.set(row.userId, {});
    }
    breakdownMap.get(row.userId)![row.action] = row._count.id;
  }

  const contributors = editCounts.map((entry, index) => ({
    rank: skip + index + 1,
    user: userMap.get(entry.userId) || { id: entry.userId, name: "Unknown", image: null },
    totalEdits: entry._count.id,
    breakdown: breakdownMap.get(entry.userId) || {},
  }));

  return { contributors, totalContributors };
}
