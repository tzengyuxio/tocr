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
import { Gamepad2, ArrowLeft, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GameDetailPage({ params }: PageProps) {
  const { id } = await params;

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      articleGames: {
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

  if (!game) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button asChild variant="ghost" className="mb-6">
        <Link href="/games">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回遊戲列表
        </Link>
      </Button>

      {/* 遊戲資訊 */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row">
        {game.coverImage ? (
          <img
            src={game.coverImage}
            alt={game.name}
            className="h-64 w-48 rounded-lg object-cover shadow-lg"
          />
        ) : (
          <div className="flex h-64 w-48 items-center justify-center rounded-lg bg-muted shadow-lg">
            <Gamepad2 className="h-16 w-16 text-muted-foreground/50" />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{game.name}</h1>
          {game.nameOriginal && (
            <p className="mt-1 text-lg text-muted-foreground">
              {game.nameOriginal}
            </p>
          )}
          {game.nameEn && game.nameEn !== game.nameOriginal && (
            <p className="text-muted-foreground">{game.nameEn}</p>
          )}

          <div className="mt-4 space-y-2 text-sm">
            {game.releaseDate && (
              <p className="flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">發售日期：</span>
                {format(new Date(game.releaseDate), "yyyy 年 M 月 d 日", {
                  locale: zhTW,
                })}
              </p>
            )}
            {game.developer && (
              <p>
                <span className="text-muted-foreground">開發商：</span>
                {game.developer}
              </p>
            )}
            {game.publisher && (
              <p>
                <span className="text-muted-foreground">發行商：</span>
                {game.publisher}
              </p>
            )}
          </div>

          {game.platforms.length > 0 && (
            <div className="mt-4">
              <span className="text-sm text-muted-foreground">平台：</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {game.platforms.map((p) => (
                  <Badge key={p} variant="outline">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {game.genres.length > 0 && (
            <div className="mt-3">
              <span className="text-sm text-muted-foreground">類型：</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {game.genres.map((g) => (
                  <Badge key={g} variant="secondary">
                    {g}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {game.description && (
            <p className="mt-4 text-muted-foreground">{game.description}</p>
          )}
        </div>
      </div>

      {/* 相關文章 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            相關文章
            <span className="text-base font-normal text-muted-foreground">
              （共 {game.articleGames.length} 篇）
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {game.articleGames.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              尚無相關文章
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>期刊</TableHead>
                  <TableHead>期數</TableHead>
                  <TableHead>出版日期</TableHead>
                  <TableHead>文章標題</TableHead>
                  <TableHead>分類</TableHead>
                  <TableHead>頁碼</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {game.articleGames.map((ag) => (
                  <TableRow key={ag.id}>
                    <TableCell>
                      <Link
                        href={`/magazines/${ag.article.issue.magazine.id}`}
                        className="hover:underline"
                      >
                        {ag.article.issue.magazine.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/magazines/${ag.article.issue.magazine.id}/issues/${ag.article.issue.id}`}
                        className="hover:underline"
                      >
                        {ag.article.issue.issueNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(
                        new Date(ag.article.issue.publishDate),
                        "yyyy/MM/dd",
                        { locale: zhTW }
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{ag.article.title}</div>
                      {ag.article.subtitle && (
                        <div className="text-sm text-muted-foreground">
                          {ag.article.subtitle}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {ag.article.category ? (
                        <Badge variant="outline">{ag.article.category}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {ag.article.pageStart || "-"}
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
