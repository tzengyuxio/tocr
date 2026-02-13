export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
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
import { Tags, ArrowLeft, FileText, SquarePen } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { auth } from "@/lib/auth";
import { getTagTypeColor, getTagTypeLabel } from "@/lib/tag-colors";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const tag = await prisma.tag.findUnique({ where: { id }, select: { name: true } });
  return { title: tag?.name ?? "標籤詳情" };
}

export default async function TagDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR";

  const tag = await prisma.tag.findUnique({
    where: { id },
    include: {
      articleTags: {
        orderBy: {
          article: {
            issue: {
              publishDate: "desc",
            },
          },
        },
        include: {
          article: {
            include: {
              issue: {
                select: {
                  id: true,
                  issueNumber: true,
                  publishDate: true,
                  magazine: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!tag) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button asChild variant="ghost" className="mb-6">
        <Link href="/tags">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回標籤列表
        </Link>
      </Button>

      {/* 標籤資訊 */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Tags className="h-8 w-8 text-muted-foreground" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{tag.name}</h1>
              {canEdit && (
                <Link
                  href={`/admin/tags/${id}`}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="編輯此標籤"
                >
                  <SquarePen className="h-4 w-4" />
                </Link>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Badge className={getTagTypeColor(tag.type)}>{getTagTypeLabel(tag.type)}</Badge>
              <span className="text-muted-foreground">
                {tag.articleTags.length} 篇相關文章
              </span>
            </div>
          </div>
        </div>
        {tag.description && (
          <p className="mt-4 text-muted-foreground">{tag.description}</p>
        )}
      </div>

      {/* 相關文章 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            相關文章
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tag.articleTags.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              尚無相關文章
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>期刊</TableHead>
                      <TableHead>期數</TableHead>
                      <TableHead>出版日期</TableHead>
                      <TableHead>文章標題</TableHead>
                      <TableHead>分類</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tag.articleTags.map((at) => (
                      <TableRow key={at.id}>
                        <TableCell>
                          <Link
                            href={`/magazines/${at.article.issue.magazine.id}`}
                            className="hover:underline"
                          >
                            {at.article.issue.magazine.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/magazines/${at.article.issue.magazine.id}/issues/${at.article.issue.id}`}
                            className="hover:underline"
                          >
                            {at.article.issue.issueNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(
                            new Date(at.article.issue.publishDate),
                            "yyyy/MM/dd",
                            { locale: zhTW }
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{at.article.title}</div>
                          {at.article.subtitle && (
                            <div className="text-sm text-muted-foreground">
                              {at.article.subtitle}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {at.article.category ? (
                            <Badge variant="outline">{at.article.category}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="divide-y md:hidden">
                {tag.articleTags.map((at) => (
                  <div key={at.id} className="py-3">
                    <div className="font-medium">{at.article.title}</div>
                    {at.article.subtitle && (
                      <div className="text-sm text-muted-foreground">{at.article.subtitle}</div>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <Link href={`/magazines/${at.article.issue.magazine.id}`} className="hover:underline">
                        {at.article.issue.magazine.name}
                      </Link>
                      <span>·</span>
                      <Link href={`/magazines/${at.article.issue.magazine.id}/issues/${at.article.issue.id}`} className="hover:underline">
                        {at.article.issue.issueNumber}
                      </Link>
                      <span>·</span>
                      <span>{format(new Date(at.article.issue.publishDate), "yyyy/MM/dd", { locale: zhTW })}</span>
                    </div>
                    {at.article.category && (
                      <Badge variant="outline" className="mt-1 text-xs">{at.article.category}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
