export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { formatValue } from "@/lib/edit-log-format";
import { prisma } from "@/lib/prisma";
import { measure } from "@/lib/perf";
import { FEED_SCOPE } from "@/lib/edit-log";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { FieldDiff } from "@/lib/edit-log-diff";
import { EditLogTargetLink } from "@/components/EditLogEntry";
import { formatTaipei } from "@/lib/datetime";
import { EditLogFilters } from "./EditLogFilters";

export const metadata: Metadata = {
  title: "編輯紀錄 - Admin",
};

const PAGE_SIZE = 50;

const ACTIONS = ["CREATE", "UPDATE", "DELETE"];
const ENTITY_TYPES = ["Magazine", "Issue", "Article", "Tag", "Game", "User"];

/** Logs written before the diff landed carry the new value alone. */
function isFieldDiff(value: unknown): value is FieldDiff {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "from" in value &&
    "to" in value
  );
}

/** Which fields an UPDATE touched and how -- the full payload is too wide. */
function ChangeSummary({ changes }: { changes: Prisma.JsonValue }) {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    return <>—</>;
  }
  const entries = Object.entries(changes);
  if (entries.length === 0) return <>—</>;

  // Pre-diff logs carry no before/after, so a row per field would only be a
  // tall list of names.
  if (!entries.every(([, value]) => isFieldDiff(value))) {
    return <span className="truncate">{entries.map(([f]) => f).join("、")}</span>;
  }

  return (
    <ul className="space-y-0.5">
      {entries.map(([field, value]) => (
        <li key={field} className="truncate">
          <span className="font-medium text-foreground">{field}</span>
          {isFieldDiff(value) && (
            <>
              {" "}
              <span className="line-through">{formatValue(value.from)}</span>
              {" → "}
              <span>{formatValue(value.to)}</span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
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
    ...FEED_SCOPE,
    ...(userId && { userId }),
    ...(entityType && ENTITY_TYPES.includes(entityType) && { entityType }),
    ...(action && ACTIONS.includes(action) && { action }),
  };

  const [logs, total, users] = await measure("admin/edit-logs", () =>
    Promise.all([
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
    ])
  );

  // This page is ADMIN-only, so target names may include user accounts.
  const targetOf = await measure("admin/edit-logs:targets", () =>
    resolveEditLogTargets(logs, { revealUsers: true })
  );

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
                      {formatTaipei(log.createdAt, "yyyy/MM/dd HH:mm")}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        {log.user.name || log.user.email}
                        {/* Only the exception is marked: everything without a
                            badge was typed into this admin by hand. */}
                        {log.via === "token" && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            API
                          </Badge>
                        )}
                      </span>
                    </TableCell>
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
                    <TableCell className="max-w-xs text-sm text-muted-foreground">
                      <ChangeSummary changes={log.changes} />
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
