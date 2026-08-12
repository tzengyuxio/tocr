export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileEdit } from "lucide-react";
import { actionIcon, actionLabel, entityLabel } from "@/lib/edit-log-labels";
import { resolveEditLogTargets } from "@/lib/edit-log-targets";
import { EditLogTargetLink } from "@/components/EditLogEntry";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { EditLogFilters } from "./EditLogFilters";

export const metadata: Metadata = {
  title: "編輯紀錄 - Admin",
};

const PAGE_SIZE = 50;

const ACTIONS = ["CREATE", "UPDATE", "DELETE"];
const ENTITY_TYPES = ["Magazine", "Issue", "Article", "Tag", "Game", "User"];

/** Which fields an UPDATE touched -- the full payload is too wide for a table. */
function changedFields(changes: Prisma.JsonValue): string {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    return "—";
  }
  const keys = Object.keys(changes);
  return keys.length === 0 ? "—" : keys.join("、");
}

export default async function EditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const userId = single("user");
  const entityType = single("entity");
  const action = single("action");
  const page = Math.max(1, Number(single("page")) || 1);

  const where: Prisma.EditLogWhereInput = {
    ...(userId && { userId }),
    ...(entityType && ENTITY_TYPES.includes(entityType) && { entityType }),
    ...(action && ACTIONS.includes(action) && { action }),
  };

  const [logs, total, users] = await Promise.all([
    prisma.editLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.editLog.count({ where }),
    prisma.user.findMany({
      where: { editLogs: { some: {} } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // This page is ADMIN-only, so target names may include user accounts.
  const targetOf = await resolveEditLogTargets(logs, { revealUsers: true });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    const next = new URLSearchParams();
    if (userId) next.set("user", userId);
    if (entityType) next.set("entity", entityType);
    if (action) next.set("action", action);
    if (target > 1) next.set("page", String(target));
    const query = next.toString();
    return query ? `/admin/edit-logs?${query}` : "/admin/edit-logs";
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">編輯紀錄</h2>
        <p className="text-muted-foreground">
          所有使用者的資料變更紀錄，可依使用者、類型與動作篩選
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>紀錄列表</CardTitle>
              <CardDescription>共 {total} 筆</CardDescription>
            </div>
            <EditLogFilters
              users={users.map((user) => ({
                id: user.id,
                label: user.name || user.email,
              }))}
            />
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <FileEdit className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">沒有符合條件的編輯紀錄</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">時間</TableHead>
                  <TableHead>使用者</TableHead>
                  <TableHead className="w-24">動作</TableHead>
                  <TableHead className="w-24">類型</TableHead>
                  <TableHead>對象</TableHead>
                  <TableHead>變更欄位</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {format(new Date(log.createdAt), "yyyy/MM/dd HH:mm", {
                        locale: zhTW,
                      })}
                    </TableCell>
                    <TableCell>{log.user.name || log.user.email}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        {actionIcon(log.action)}
                        {actionLabel(log.action)}
                      </span>
                    </TableCell>
                    <TableCell>{entityLabel(log.entityType)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      <EditLogTargetLink target={targetOf(log)} />
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {changedFields(log.changes)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                第 {page} / {totalPages} 頁
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={pageHref(page - 1)}>上一頁</Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    上一頁
                  </Button>
                )}
                {page < totalPages ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={pageHref(page + 1)}>下一頁</Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    下一頁
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
