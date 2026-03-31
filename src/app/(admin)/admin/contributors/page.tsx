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
import { Users, FileEdit, Award } from "lucide-react";
import { actionIcon, actionLabel, entityLabel } from "@/lib/edit-log-labels";
import { getContributorLeaderboard } from "@/lib/contributor-queries";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

export const metadata: Metadata = {
  title: "貢獻者 - Admin",
};

export default async function ContributorsPage() {
  const [
    { contributors, totalContributors },
    totalEdits,
    recentEditsCount,
    recentActivity,
  ] = await Promise.all([
    getContributorLeaderboard({ take: 20, includeEmail: true }),
    prisma.editLog.count(),
    prisma.editLog.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.editLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    }),
  ]);

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
