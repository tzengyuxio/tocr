export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { auth } from "@/lib/auth";
import { isDevBypass } from "@/lib/dev-auth";
import { prisma } from "@/lib/prisma";
import { measure } from "@/lib/perf";
import { formatTaipei } from "@/lib/datetime";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LinkPager } from "@/components/admin/LinkPager";

export const metadata: Metadata = {
  title: "匯出紀錄 - Admin",
};

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{ page?: string | string[] }>;
}

export default async function ExportLogsPage({ searchParams }: PageProps) {
  // 側欄已經藏起這一頁，但藏起來不是擋住 -- 網址還是打得進來。
  if (!isDevBypass) {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") notFound();
  }

  const params = await searchParams;
  const raw = Array.isArray(params.page) ? params.page[0] : params.page;
  const page = Math.max(1, Number(raw) || 1);

  const [logs, total] = await measure("admin/export-logs", () =>
    Promise.all([
      prisma.exportLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.exportLog.count(),
    ])
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (target: number) =>
    target > 1 ? `/admin/export-logs?page=${target}` : "/admin/export-logs";

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">匯出紀錄</h2>
        <p className="text-muted-foreground">
          誰在什麼時候把哪些資料匯出去。僅管理員可見
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>紀錄列表</CardTitle>
          <CardDescription>共 {total} 筆</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Download className="mb-2 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">還沒有人匯出過資料</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">時間</TableHead>
                  <TableHead>匯出者</TableHead>
                  <TableHead>範圍</TableHead>
                  <TableHead className="w-24">筆數</TableHead>
                  <TableHead className="w-36">IP</TableHead>
                  <TableHead>User-Agent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatTaipei(log.createdAt, "yyyy/MM/dd HH:mm")}
                    </TableCell>
                    <TableCell>{log.user.name || log.user.email}</TableCell>
                    <TableCell>{log.magazineName ?? "全部雜誌"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {/* 沒有筆數代表串流沒跑完 -- 中途失敗或使用者取消。 */}
                      {log.rowCount ?? "未完成"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.ipAddress ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {log.userAgent ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <LinkPager page={page} totalPages={totalPages} pageHref={pageHref} />
        </CardContent>
      </Card>
    </div>
  );
}
