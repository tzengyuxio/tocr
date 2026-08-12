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
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

export const metadata: Metadata = {
  title: "單期複查 - Admin",
};

const PAGE_SIZE = 50;

const FILTERS = [
  {
    key: "pending",
    label: "待複查",
    description: "已有目錄資料，但沒有人確認過內容",
    // An issue with neither scans nor articles has nothing to review yet.
    // Articles count on their own: OCR can be run on images that were never
    // attached to the issue.
    where: {
      tocReviewedAt: null,
      OR: [{ NOT: { tocImages: { isEmpty: true } } }, { articles: { some: {} } }],
    },
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

  const [issues, total, pendingCount] = await Promise.all([
    prisma.issue.findMany({
      where: filter.where,
      orderBy: { publishSort: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        magazine: { select: { id: true, name: true } },
        _count: { select: { articles: true } },
      },
    }),
    prisma.issue.count({ where: filter.where }),
    prisma.issue.count({ where: FILTERS[0].where }),
  ]);

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
                  <TableHead>期刊</TableHead>
                  <TableHead>期號</TableHead>
                  <TableHead className="w-28">出版日期</TableHead>
                  <TableHead className="w-20">目錄圖</TableHead>
                  <TableHead className="w-20">文章</TableHead>
                  <TableHead className="w-36">複查狀態</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="text-muted-foreground">
                      {issue.magazine.name}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/magazines/${issue.magazine.id}/issues/${issue.id}`}
                        className="font-medium hover:underline"
                      >
                        {issue.issueNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {issue.publishDate}
                    </TableCell>
                    <TableCell>{issue.tocImages.length}</TableCell>
                    <TableCell>{issue._count.articles}</TableCell>
                    <TableCell>
                      {issue.tocReviewedAt ? (
                        <Badge variant="secondary">
                          {format(new Date(issue.tocReviewedAt), "yyyy/MM/dd", {
                            locale: zhTW,
                          })}
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
