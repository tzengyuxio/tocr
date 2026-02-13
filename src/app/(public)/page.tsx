export const dynamic = "force-dynamic";

import Link from "next/link";
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
import { IssueCard } from "@/components/IssueCard";
import { StatGrid } from "@/components/StatGrid";
import {
  BookOpen,
  Gamepad2,
  Tags,
  FileText,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR";

  // 取得統計數據
  const [magazineCount, issueCount, articleCount, gameCount, tagCount] =
    await Promise.all([
      prisma.magazine.count(),
      prisma.issue.count(),
      prisma.article.count(),
      prisma.game.count(),
      prisma.tag.count(),
    ]);

  // 取得最新期數（含期刊資訊）
  const latestIssues = await prisma.issue.findMany({
    take: 6,
    orderBy: { publishDate: "desc" },
    include: {
      magazine: {
        select: { id: true, name: true },
      },
      _count: {
        select: { articles: true },
      },
    },
  });

  // 取得最近更新的文章
  const recentArticles = await prisma.article.findMany({
    take: 5,
    orderBy: { updatedAt: "desc" },
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
  });

  // 取得熱門遊戲（依相關文章數排序）
  const popularGames = await prisma.game.findMany({
    take: 8,
    orderBy: {
      articleGames: {
        _count: "desc",
      },
    },
    include: {
      _count: {
        select: { articleGames: true },
      },
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          期刊目錄索引系統
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          探索遊戲雜誌的歷史，透過期刊、遊戲、標籤找到您想要的文章
        </p>
      </section>

      {/* Stats Section */}
      <section className="mb-12">
        <StatGrid
          items={[
            { label: "期刊", value: magazineCount, icon: BookOpen },
            { label: "期數", value: issueCount, icon: Calendar },
            { label: "文章", value: articleCount, icon: FileText },
            { label: "遊戲", value: gameCount, icon: Gamepad2 },
            { label: "標籤", value: tagCount, icon: Tags },
          ]}
        />
      </section>

      {/* Latest Issues Section */}
      <section className="mb-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">最新期數</h2>
          <Button variant="ghost" asChild>
            <Link href="/magazines">
              查看所有期刊
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {latestIssues.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              尚無期數資料
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {latestIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                magazineId={issue.magazine.id}
                magazineName={issue.magazine.name}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent Articles Section */}
      <section className="mb-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">最近更新</h2>
          <Button variant="ghost" asChild>
            <Link href="/search">
              搜尋文章
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {recentArticles.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              尚無文章資料
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentArticles.map((article) => (
                  <div
                    key={article.id}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
                  >
                    <Link
                      href={`/magazines/${article.issue.magazine.id}/issues/${article.issue.id}`}
                      className="flex-1"
                    >
                      <div className="font-medium">{article.title}</div>
                      {article.subtitle && (
                        <div className="text-sm text-muted-foreground">
                          {article.subtitle}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {article.issue.magazine.name} ·{" "}
                        {article.issue.issueNumber}
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 ml-4">
                      {article.category && (
                        <Badge variant="outline">
                          {article.category}
                        </Badge>
                      )}
                      {canEdit && (
                        <Link
                          href={`/admin/articles/${article.id}`}
                          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="編輯文章"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Popular Games Section */}
      <section className="mb-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">熱門遊戲</h2>
          <Button variant="ghost" asChild>
            <Link href="/games">
              查看所有遊戲
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {popularGames.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              尚無遊戲資料
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
            {popularGames.map((game) => (
              <Link key={game.id} href={`/games/${game.id}`}>
                <Card className="h-full transition-shadow hover:shadow-lg">
                  <CardContent className="flex items-center gap-3 p-3">
                    {game.coverImage ? (
                      <img
                        src={game.coverImage}
                        alt={game.name}
                        className="h-12 w-12 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted">
                        <Gamepad2 className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium line-clamp-1 text-sm">{game.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {game._count.articleGames} 篇相關文章
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section>
        <h2 className="mb-6 text-2xl font-bold">快速導覽</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/magazines">
            <Card className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <BookOpen className="mb-2 h-8 w-8" />
                <CardTitle>瀏覽期刊</CardTitle>
                <CardDescription>查看所有收錄的遊戲雜誌</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/games">
            <Card className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <Gamepad2 className="mb-2 h-8 w-8" />
                <CardTitle>遊戲索引</CardTitle>
                <CardDescription>依遊戲名稱找相關報導</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/tags">
            <Card className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <Tags className="mb-2 h-8 w-8" />
                <CardTitle>標籤分類</CardTitle>
                <CardDescription>人物、活動、系列等分類</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/search">
            <Card className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <FileText className="mb-2 h-8 w-8" />
                <CardTitle>搜尋文章</CardTitle>
                <CardDescription>關鍵字搜尋所有文章</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}
