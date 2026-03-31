// Revalidate homepage every 60 seconds (ISR)
export const revalidate = 60;

import Link from "next/link";
import Image from "next/image";
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
  Users,
  Search,
  ScanText,
} from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR";

  // Run all queries in parallel
  const [
    magazineCount,
    issueCount,
    articleCount,
    gameCount,
    tagCount,
    latestIssues,
    recentArticles,
    popularGames,
  ] = await Promise.all([
    prisma.magazine.count(),
    prisma.issue.count(),
    prisma.article.count(),
    prisma.game.count(),
    prisma.tag.count(),
    prisma.issue.findMany({
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
    }),
    prisma.article.findMany({
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
    }),
    prisma.game.findMany({
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
    }),
  ]);

  return (
    <div className="animate-fade-in-up">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-3 text-4xl font-bold tracking-tight md:text-5xl">
              遊戲雜誌
              <span className="text-primary">目錄索引</span>
            </h1>
            <p className="mx-auto mb-6 max-w-xl text-lg text-muted-foreground">
              收錄台灣與日本遊戲雜誌的完整目錄資料，透過 AI 辨識技術，
              將紙本目錄數位化為可搜尋的索引
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/search">
                  <Search className="mr-2 h-4 w-4" />
                  搜尋文章
                </Link>
              </Button>
              <Button variant="outline" asChild size="lg">
                <Link href="/magazines">
                  <BookOpen className="mr-2 h-4 w-4" />
                  瀏覽期刊
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats - integrated into hero */}
          <div className="mt-10">
            <StatGrid
              items={[
                { label: "期刊", value: magazineCount, icon: BookOpen },
                { label: "單期", value: issueCount, icon: Calendar },
                { label: "文章", value: articleCount, icon: FileText },
                { label: "遊戲", value: gameCount, icon: Gamepad2 },
                { label: "標籤", value: tagCount, icon: Tags },
              ]}
            />
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 space-y-14">
        {/* Latest Issues Section */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">最新單期</h2>
              <p className="text-sm text-muted-foreground">最近新增的雜誌期數</p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/magazines">
                查看所有期刊
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {latestIssues.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="font-medium">尚無單期資料</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {canEdit ? (
                    <Link href="/admin/magazines" className="text-primary hover:underline">
                      前往後台新增第一本期刊
                    </Link>
                  ) : "資料建置中，請稍後再來"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 stagger-children">
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
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">最近更新</h2>
              <p className="text-sm text-muted-foreground">最新編輯的文章目錄</p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/search">
                搜尋文章
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {recentArticles.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="font-medium">尚無文章資料</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {canEdit ? (
                    <Link href="/admin/ocr" className="text-primary hover:underline">
                      使用 AI 辨識快速建立目錄
                    </Link>
                  ) : "資料建置中，請稍後再來"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="py-0 gap-0">
              <CardContent className="!p-0">
                <div className="divide-y">
                  {recentArticles.map((article) => (
                    <div
                      key={article.id}
                      className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <Link
                        href={`/magazines/${article.issue.magazine.id}/issues/${article.issue.id}`}
                        className="flex-1"
                      >
                        <div className="font-medium text-sm">{article.title}</div>
                        {article.subtitle && (
                          <div className="text-xs text-muted-foreground">
                            {article.subtitle}
                          </div>
                        )}
                        <div className="mt-0.5 text-xs text-muted-foreground">
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
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">熱門遊戲</h2>
              <p className="text-sm text-muted-foreground">最多文章提及的遊戲</p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/games">
                查看所有遊戲
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {popularGames.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <Gamepad2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="font-medium">尚無遊戲資料</p>
                <p className="text-sm text-muted-foreground mt-1">遊戲會在文章建立時自動產生</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
              {popularGames.map((game) => (
                <Link key={game.id} href={`/games/${game.id}`}>
                  <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-0.5 py-0 gap-0">
                    <CardContent className="flex items-center gap-3 !p-3">
                      {game.coverImage ? (
                        <Image
                          src={game.coverImage}
                          alt={game.name}
                          width={48}
                          height={48}
                          className="h-12 w-12 shrink-0 rounded object-cover"
                          unoptimized
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

        {/* How It Works - brief intro for new visitors */}
        <section className="rounded-xl border bg-muted/30 p-5 md:p-6">
          <h2 className="mb-3 text-lg font-bold text-center">如何使用</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Search, title: "搜尋文章", desc: "輸入遊戲名稱、作者或關鍵字，快速找到跨期刊的相關報導" },
              { icon: BookOpen, title: "瀏覽目錄", desc: "依期刊、期數瀏覽完整目錄，找回記憶中的那篇文章" },
              { icon: ScanText, title: "協助建檔", desc: "上傳目錄頁掃描圖，AI 自動辨識文章資訊，協作完善資料庫" },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="font-medium mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Links */}
        <section>
          <h2 className="mb-6 text-2xl font-bold">快速導覽</h2>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <Link href="/magazines">
              <Card className="transition-all hover:shadow-lg hover:-translate-y-0.5">
                <CardHeader className="gap-2 px-6">
                  <BookOpen className="h-6 w-6 text-primary" />
                  <CardTitle>瀏覽期刊</CardTitle>
                  <CardDescription>查看所有收錄的遊戲雜誌</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/games">
              <Card className="transition-all hover:shadow-lg hover:-translate-y-0.5">
                <CardHeader className="gap-2 px-6">
                  <Gamepad2 className="h-6 w-6 text-primary" />
                  <CardTitle>遊戲索引</CardTitle>
                  <CardDescription>依遊戲名稱找相關報導</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/tags">
              <Card className="transition-all hover:shadow-lg hover:-translate-y-0.5">
                <CardHeader className="gap-2 px-6">
                  <Tags className="h-6 w-6 text-primary" />
                  <CardTitle>標籤分類</CardTitle>
                  <CardDescription>人物、活動、系列等分類</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/search">
              <Card className="transition-all hover:shadow-lg hover:-translate-y-0.5">
                <CardHeader className="gap-2 px-6">
                  <FileText className="h-6 w-6 text-primary" />
                  <CardTitle>搜尋文章</CardTitle>
                  <CardDescription>關鍵字搜尋所有文章</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/contributors">
              <Card className="transition-all hover:shadow-lg hover:-translate-y-0.5">
                <CardHeader className="gap-2 px-6">
                  <Users className="h-6 w-6 text-primary" />
                  <CardTitle>貢獻者</CardTitle>
                  <CardDescription>感謝所有資料貢獻者</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
