export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatGrid } from "@/components/StatGrid";
import { Users, FileEdit, Plus, Trash2, Award } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

export const metadata: Metadata = {
  title: "貢獻者 - Admin",
};

export default async function ContributorsPage() {
  // Get overall stats
  const [totalEdits, totalContributors, recentEditsCount] = await Promise.all([
    prisma.editLog.count(),
    prisma.editLog.groupBy({ by: ["userId"] }).then((r) => r.length),
    prisma.editLog.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  // Get top contributors (all time)
  const editCounts = await prisma.editLog.groupBy({
    by: ["userId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 20,
  });

  const userIds = editCounts.map((e) => e.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, image: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Get action breakdown per user
  const actionBreakdowns = await prisma.editLog.groupBy({
    by: ["userId", "action"],
    where: { userId: { in: userIds } },
    _count: { id: true },
  });

  const breakdownMap = new Map<string, Record<string, number>>();
  for (const row of actionBreakdowns) {
    if (!breakdownMap.has(row.userId)) {
      breakdownMap.set(row.userId, {});
    }
    breakdownMap.get(row.userId)![row.action] = row._count.id;
  }

  // Get recent activity
  const recentActivity = await prisma.editLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  const contributors = editCounts.map((entry, index) => ({
    rank: index + 1,
    user: userMap.get(entry.userId),
    totalEdits: entry._count.id,
    breakdown: breakdownMap.get(entry.userId) || {},
  }));

  const actionIcon = (action: string) => {
    switch (action) {
      case "CREATE": return <Plus className="h-3 w-3 text-green-600" />;
      case "UPDATE": return <FileEdit className="h-3 w-3 text-blue-600" />;
      case "DELETE": return <Trash2 className="h-3 w-3 text-red-600" />;
      default: return null;
    }
  };

  const actionLabel = (action: string) => {
    switch (action) {
      case "CREATE": return "新增";
      case "UPDATE": return "更新";
      case "DELETE": return "刪除";
      default: return action;
    }
  };

  const entityLabel = (type: string) => {
    switch (type) {
      case "Magazine": return "期刊";
      case "Issue": return "單期";
      case "Article": return "文章";
      case "Tag": return "標籤";
      case "Game": return "遊戲";
      case "User": return "使用者";
      default: return type;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">貢獻者</h1>
        <p className="mt-2 text-muted-foreground">
          追蹤資料編輯活動與貢獻者排行
        </p>
      </div>

      {/* Stats */}
      <section className="mb-8">
        <StatGrid
          items={[
            { label: "總編輯次數", value: totalEdits, icon: FileEdit },
            { label: "貢獻者人數", value: totalContributors, icon: Users },
            { label: "本週編輯", value: recentEditsCount, icon: Award },
          ]}
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              貢獻排行榜
            </CardTitle>
            <CardDescription>依總編輯次數排序</CardDescription>
          </CardHeader>
          <CardContent>
            {contributors.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                尚無編輯紀錄
              </p>
            ) : (
              <div className="space-y-3">
                {contributors.map((c) => (
                  <div
                    key={c.user?.id ?? c.rank}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-sm">
                      {c.rank <= 3 ? ["🥇", "🥈", "🥉"][c.rank - 1] : c.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {c.user?.name || c.user?.email || "Unknown"}
                      </p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {c.breakdown.CREATE && (
                          <span className="text-green-600">+{c.breakdown.CREATE} 新增</span>
                        )}
                        {c.breakdown.UPDATE && (
                          <span className="text-blue-600">{c.breakdown.UPDATE} 更新</span>
                        )}
                        {c.breakdown.DELETE && (
                          <span className="text-red-600">{c.breakdown.DELETE} 刪除</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {c.totalEdits} 次
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5" />
              最近活動
            </CardTitle>
            <CardDescription>最近 30 筆編輯紀錄</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                尚無編輯紀錄
              </p>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 rounded border px-3 py-2 text-sm"
                  >
                    <div className="shrink-0">
                      {actionIcon(log.action)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">
                        {log.user.name || log.user.email}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}{actionLabel(log.action)}了{entityLabel(log.entityType)}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {format(new Date(log.createdAt), "MM/dd HH:mm", { locale: zhTW })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
