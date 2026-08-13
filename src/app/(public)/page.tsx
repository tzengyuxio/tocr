// Revalidate homepage every 60 seconds (ISR)
export const revalidate = 60;

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IssueCard } from "@/components/IssueCard";
import { StatGrid } from "@/components/StatGrid";
import {
  BookOpen,
  Gamepad2,
  Tags,
  FileText,
  ArrowRight,
  Calendar,
  Search,
} from "lucide-react";
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
  ] = await Promise.all([
    prisma.magazine.count(),
    prisma.issue.count(),
    prisma.article.count(),
    prisma.game.count(),
    prisma.tag.count(),
    prisma.issue.findMany({
      take: 6,
      // Most of the 549 imported issues are still bare records with nothing but
      // a number and a date -- showing those reads as a broken page.
      where: {
        OR: [{ coverImage: { not: null } }, { articles: { some: {} } }],
      },
      // Recently touched, not recently published: an issue that just had its
      // contents filled in is the interesting one, whatever year it came out.
      orderBy: { updatedAt: "desc" },
      include: {
        magazine: {
          select: { id: true, name: true },
        },
        _count: {
          select: { articles: true },
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

            {/* The search box is the front page: most issues have no table of
                contents yet, so browsing rewards less than searching. */}
            <form action="/search" method="get" className="mx-auto max-w-xl">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    name="q"
                    type="text"
                    placeholder="搜尋期刊、遊戲或文章關鍵字..."
                    className="h-11 pl-10"
                    aria-label="搜尋"
                  />
                </div>
                <Button type="submit" size="lg">
                  搜尋
                </Button>
              </div>
            </form>
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

      <div className="container mx-auto px-4 py-8">
        {/* Latest Issues Section */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">最新單期</h2>
              <p className="text-sm text-muted-foreground">最近更新的雜誌期數</p>
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
      </div>
    </div>
  );
}
