export const dynamic = "force-dynamic";

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
import { BookOpen, ArrowLeft, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

interface PageProps {
  params: Promise<{ id: string; issueId: string }>;
}

export default async function IssueDetailPage({ params }: PageProps) {
  const { id, issueId } = await params;

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      magazine: true,
      articles: {
        orderBy: { sortOrder: "asc" },
        include: {
          articleGames: {
            include: {
              game: {
                select: { id: true, name: true },
              },
            },
          },
          articleTags: {
            include: {
              tag: {
                select: { id: true, name: true, type: true },
              },
            },
          },
        },
      },
    },
  });

  if (!issue || issue.magazineId !== id) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button asChild variant="ghost" className="mb-6">
        <Link href={`/magazines/${issue.magazineId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回 {issue.magazine.name}
        </Link>
      </Button>

      {/* 期數資訊 */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row">
        {issue.coverImage ? (
          <img
            src={issue.coverImage}
            alt={issue.issueNumber}
            className="h-80 w-56 rounded-lg object-cover shadow-lg"
          />
        ) : (
          <div className="flex h-80 w-56 items-center justify-center rounded-lg bg-muted shadow-lg">
            <BookOpen className="h-16 w-16 text-muted-foreground/50" />
          </div>
        )}
        <div className="flex-1">
          <div className="text-sm text-muted-foreground">
            <Link
              href={`/magazines/${issue.magazineId}`}
              className="hover:underline"
            >
              {issue.magazine.name}
            </Link>
          </div>
          <h1 className="text-3xl font-bold">{issue.issueNumber}</h1>
          {issue.title && (
            <p className="mt-2 text-xl text-muted-foreground">{issue.title}</p>
          )}
          <div className="mt-4 space-y-2 text-sm">
            <p className="flex items-center">
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">出版日期：</span>
              {format(new Date(issue.publishDate), "yyyy 年 M 月 d 日", {
                locale: zhTW,
              })}
            </p>
            {issue.pageCount && (
              <p>
                <span className="text-muted-foreground">頁數：</span>
                {issue.pageCount} 頁
              </p>
            )}
            {issue.price && (
              <p>
                <span className="text-muted-foreground">定價：</span>
                NT$ {Number(issue.price)}
              </p>
            )}
          </div>
          {issue.notes && (
            <p className="mt-4 text-muted-foreground">{issue.notes}</p>
          )}
        </div>
      </div>

      {/* 目錄 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            目錄
            <span className="text-base font-normal text-muted-foreground">
              （共 {issue.articles.length} 篇文章）
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {issue.articles.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              尚無文章資料
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">頁碼</TableHead>
                  <TableHead>標題</TableHead>
                  <TableHead>作者</TableHead>
                  <TableHead>分類</TableHead>
                  <TableHead>相關遊戲</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issue.articles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {article.pageStart}
                      {article.pageEnd && article.pageEnd !== article.pageStart
                        ? `-${article.pageEnd}`
                        : ""}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{article.title}</div>
                      {article.subtitle && (
                        <div className="text-sm text-muted-foreground">
                          {article.subtitle}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {article.authors.length > 0
                        ? article.authors.join(", ")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {article.category ? (
                        <Badge variant="outline">{article.category}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {article.articleGames.map((ag) => (
                          <Link
                            key={ag.game.id}
                            href={`/games/${ag.game.id}`}
                          >
                            <Badge
                              variant="secondary"
                              className="cursor-pointer hover:bg-secondary/80"
                            >
                              {ag.game.name}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
