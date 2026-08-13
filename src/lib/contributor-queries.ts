import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { API_USER } from "./api-token";

/**
 * The bulk importer writes one log row per record it touches, which puts it
 * hundreds of edits ahead of any person. It is a script, not a contributor.
 */
const EXCLUDED_USER_IDS = [API_USER.id];

/**
 * A batch save logs one row for the whole batch and records how many records
 * it covered, so reviewing 50 articles would otherwise count as a single edit.
 * Weigh each row by that count, defaulting to one for ordinary edits.
 */
const EDIT_WEIGHT = Prisma.sql`
  SUM(
    CASE
      WHEN jsonb_typeof(changes -> 'count') = 'number' THEN (changes ->> 'count')::int
      ELSE 1
    END
  )::int
`;

function scopeFilter(since: Date | undefined) {
  const excluded = Prisma.sql`user_id NOT IN (${Prisma.join(EXCLUDED_USER_IDS)})`;
  return since ? Prisma.sql`${excluded} AND created_at >= ${since}` : excluded;
}

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

/**
 * Edits made in the last `days` days.
 *
 * Lives here rather than inline in the page: reading the clock is impure, and
 * the React Compiler rejects it in a component body.
 */
export async function countRecentEdits(days: number): Promise<number> {
  return prisma.editLog.count({
    where: { createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } },
  });
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
  const scope = scopeFilter(dateFilter.gte);

  // First batch: editCounts + totalContributors in parallel
  const [editCounts, totalGroups] = await Promise.all([
    prisma.$queryRaw<{ userId: string; total: number }[]>`
      SELECT user_id AS "userId", ${EDIT_WEIGHT} AS total
      FROM edit_logs
      WHERE ${scope}
      GROUP BY user_id
      ORDER BY total DESC
      OFFSET ${skip} LIMIT ${take}
    `,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT user_id)::int AS count FROM edit_logs WHERE ${scope}
    `,
  ]);

  const totalContributors = totalGroups[0]?.count ?? 0;
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
    prisma.$queryRaw<{ userId: string; action: string; total: number }[]>`
      SELECT user_id AS "userId", action, ${EDIT_WEIGHT} AS total
      FROM edit_logs
      WHERE ${scope} AND user_id IN (${Prisma.join(userIds)})
      GROUP BY user_id, action
    `,
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const breakdownMap = new Map<string, Record<string, number>>();
  for (const row of actionBreakdowns) {
    if (!breakdownMap.has(row.userId)) {
      breakdownMap.set(row.userId, {});
    }
    breakdownMap.get(row.userId)![row.action] = row.total;
  }

  const contributors = editCounts.map((entry, index) => ({
    rank: skip + index + 1,
    user: userMap.get(entry.userId) || { id: entry.userId, name: "Unknown", image: null },
    totalEdits: entry.total,
    breakdown: breakdownMap.get(entry.userId) || {},
  }));

  return { contributors, totalContributors };
}
