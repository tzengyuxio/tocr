import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler, paginatedResponse, parsePagination } from "@/lib/api-utils";

// GET /api/contributors - 取得貢獻者排行
export const GET = withErrorHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const { page, limit, skip } = parsePagination(searchParams);
  const period = searchParams.get("period"); // "week", "month", "all"

  // Build date filter
  const dateFilter: { gte?: Date } = {};
  if (period === "week") {
    dateFilter.gte = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "month") {
    dateFilter.gte = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  const where = dateFilter.gte ? { createdAt: dateFilter } : {};

  // Get all contributors with edit counts, grouped by user
  const editCounts = await prisma.editLog.groupBy({
    by: ["userId"],
    where,
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    skip,
    take: limit,
  });

  // Get total unique contributors
  const totalContributors = await prisma.editLog.groupBy({
    by: ["userId"],
    where,
  });

  // Fetch user details for the contributors
  const userIds = editCounts.map((e) => e.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, image: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  // Get action breakdown per user
  const actionBreakdowns = await prisma.editLog.groupBy({
    by: ["userId", "action"],
    where: {
      ...where,
      userId: { in: userIds },
    },
    _count: { id: true },
  });

  const breakdownMap = new Map<string, Record<string, number>>();
  for (const row of actionBreakdowns) {
    if (!breakdownMap.has(row.userId)) {
      breakdownMap.set(row.userId, {});
    }
    breakdownMap.get(row.userId)![row.action] = row._count.id;
  }

  // Build response
  const data = editCounts.map((entry, index) => ({
    rank: skip + index + 1,
    user: userMap.get(entry.userId) || {
      id: entry.userId,
      name: "Unknown",
      email: "",
      image: null,
    },
    totalEdits: entry._count.id,
    breakdown: breakdownMap.get(entry.userId) || {},
  }));

  return paginatedResponse(data, totalContributors.length, page, limit);
}, "Fetch contributors");
