export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { measure } from "@/lib/perf";
import { PENDING_REVIEW_WHERE } from "@/lib/issue-review";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "lucide-react";
import { formatTaipei } from "@/lib/datetime";
import { formatIssueNumber } from "@/lib/issue-number";
import { LinkPager } from "@/components/admin/LinkPager";
import { CompleteBadge } from "@/components/magazine/CompleteBadge";
import { isSessionAdmin } from "@/lib/require-editor";

export const metadata: Metadata = {
  title: "單期複查 - Admin",
};

const PAGE_SIZE = 50;

const FILTERS = [
  {
    key: "pending",
    label: "待複查",
    description: "已有目錄資料，但沒有人確認過內容",
    where: PENDING_REVIEW_WHERE,
  },
  {
    key: "reviewed",
    label: "已複查",
    description: "有人確認過目錄內容",
    where: { tocReviewedAt: { not: null } },
  },
  { key: "all", label: "全部", description: "所有單期", where: {} },
] as const satisfies readonly {
  key: string;
  label: string;
  description: string;
  where: Prisma.IssueWhereInput;
}[];

export default async function IssueReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.filter;
  const key = Array.isArray(raw) ? raw[0] : raw;
  const filter = FILTERS.find((f) => f.key === key) ?? FILTERS[0];
  const pageParam = Array.isArray(params.page) ? params.page[0] : params.page;
  const page = Math.max(1, Number(pageParam) || 1);
  // 完備標記只給 ADMIN 看。
  const isAdmin = await isSessionAdmin();

  const [issues, total, pendingCount] = await measure("admin/issues", () =>
    Promise.all([
      prisma.issue.findMany({
        where: filter.where,
        // Every magazine at once, so this is a timeline: undated issues sort
        // last rather than leading the list.
        orderBy: [{ publishSort: { sort: "desc", nulls: "last" } }, { id: "asc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          magazine: { select: { id: true, name: true } },
          _count: { select: { articles: true } },
        },
      }),
      prisma.issue.count({ where: filter.where }),
      prisma.issue.count({ where: FILTERS[0].where }),
    ])
  );

  // Latest recognition per issue: Prisma has no "greatest per group", so take
  // them newest first and keep the first of each.
  const recognisedAt = await measure("admin/issues:ocr", async () => {
    const byIssue = new Map<string, Date>();
    if (issues.length > 0) {
      const records = await prisma.ocrRecord.findMany({
        where: { issueId: { in: issues.map((issue) => issue.id) } },
        select: { issueId: true, processedAt: true },
        orderBy: { processedAt: "desc" },
      });
      for (const record of records) {
        if (record.issueId && !byIssue.has(record.issueId)) {
          byIssue.set(record.issueId, record.processedAt);
        }
      }
    }
    return byIssue;
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (target: number) =>
    `/admin/issues?filter=${filter.key}${target > 1 ? `&page=${target}` : ""}`;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">單期複查</h2>
        <p className="text-muted-foreground">
          找出還沒有人確認過目錄內容的單期，補上複查
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            variant={f.key === filter.key ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href={`/admin/issues?filter=${f.key}`}>
              {f.label}
              {f.key === "pending" && pendingCount > 0 && (
                <span className="ml-1.5">{pendingCount}</span>
              )}
            </Link>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{filter.label}</CardTitle>
          <CardDescription>
            {filter.description} · 共 {total} 期
          </CardDescription>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">沒有符合條件的單期</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>單期</TableHead>
                  <TableHead className="w-28">出版日期</TableHead>
                  <TableHead className="w-20">目錄圖</TableHead>
                  <TableHead className="w-20">文章</TableHead>
                  <TableHead className="w-28">辨識日期</TableHead>
                  <TableHead className="w-32">複查狀態</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow key={issue.id} className="hover:bg-muted/50">
                    {/* The magazine and its number name one thing, so they
                        read as one line at one size -- stacking them shrank the
                        legible half and enlarged the digits.

                        The link is the text and nothing more. It used to
                        stretch over the whole row via an ::after on a
                        position:relative <tr> -- which CSS 2.1 leaves
                        undefined for table rows, and WebKit does not make a
                        containing block. In Safari every row's overlay was
                        laid out against an ancestor instead, the last row's
                        covered the table, and every click in the list opened
                        that one issue. */}
                    <TableCell>
                      <Link
                        href={`/admin/magazines/${issue.magazine.id}/issues/${issue.id}`}
                        className="hover:underline"
                      >
                        {issue.magazine.name}{" "}
                        <span className="font-semibold">
                          {formatIssueNumber(issue.issueNumber)}
                        </span>
                      </Link>
                      {isAdmin && (
                        <span className="ml-2 align-middle">
                          <CompleteBadge issue={issue} />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {issue.publishDate ?? "-"}
                    </TableCell>
                    <TableCell>{issue.tocImages.length}</TableCell>
                    <TableCell>{issue._count.articles}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {recognisedAt.has(issue.id)
                        ? formatTaipei(recognisedAt.get(issue.id)!, "yyyy/MM/dd")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {issue.tocReviewedAt ? (
                        <Badge variant="secondary">
                          {formatTaipei(issue.tocReviewedAt, "yyyy/MM/dd")}
                        </Badge>
                      ) : (
                        <Badge variant="outline">未複查</Badge>
                      )}
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
