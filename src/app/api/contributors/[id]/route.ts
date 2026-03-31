import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-utils";

// GET /api/contributors/[id] - 取得單一貢獻者詳情
export const GET = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, image: true, createdAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [totalEdits, actionBreakdown, entityBreakdown, recentActivity] = await Promise.all([
    prisma.editLog.count({
      where: { userId: id },
    }),
    prisma.editLog.groupBy({
      by: ["action"],
      where: { userId: id },
      _count: { id: true },
    }),
    prisma.editLog.groupBy({
      by: ["entityType"],
      where: { userId: id },
      _count: { id: true },
    }),
    prisma.editLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        entityType: true,
        entityId: true,
        action: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    user,
    stats: {
      totalEdits,
      actions: Object.fromEntries(
        actionBreakdown.map((a) => [a.action, a._count.id])
      ),
      entities: Object.fromEntries(
        entityBreakdown.map((e) => [e.entityType, e._count.id])
      ),
    },
    recentActivity,
  });
}, "Fetch contributor detail");
