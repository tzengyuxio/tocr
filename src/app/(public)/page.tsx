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
import { isVerifiedIssue } from "@/lib/issue-complete";

// Two rows of eight on a wide screen.
const LATEST_ISSUE_COUNT = 16;

/** 涵蓋率取整數：小數點後那一位說不出更多事，只會讓這行變長。 */
function percent(part: number, whole: number): string {
  return `${Math.round((part / whole) * 100)}%`;
}

export default async function HomePage() {
  const session = await auth();
  const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR";

  // Run all queries in parallel
  // Recently touched, not recently published: an issue that just had its
  // contents filled in is the interesting one, whatever year it came out.
  const latestIssueQuery = {
    orderBy: { updatedAt: "desc" },
    include: {
      magazine: {
        select: { id: true, name: true, slug: true },
      },
      _count: {
        select: { articles: true },
      },
    },
  } as const;

  const [
    magazineCount,
    issueCount,
    articleCount,
    gameCount,
    tagCount,
    coveredCount,
    indexedCount,
    withArticles,
  ] = await Promise.all([
    prisma.magazine.count(),
    prisma.issue.count(),
    prisma.article.count(),
    prisma.game.count(),
    prisma.tag.count(),
    // 五個總數說得出這個站有多大，說不出收到哪裡。這兩個才是涵蓋率：一期的
    // 封面與目錄是兩件獨立的工作，所以分開數，而且都是相對於 issueCount 講的
    // ——跟雜誌列表頁那句「收錄 N / 已知 M 期」是同一件事的不同尺度。
    prisma.issue.count({ where: { coverImage: { not: null } } }),
    prisma.issue.count({ where: { articles: { some: {} } } }),
    // An issue whose contents are indexed is what the site is for, so those
    // come first and the rest only fill the row out. A cover is required in
    // both tiers: the card is mostly the cover, and one without it reads as a
    // hole in the row even when the issue behind it has a full table of
    // contents. Photos hung on the issue do not count -- those are sourced
    // from elsewhere and carry someone else's credit.
    prisma.issue.findMany({
      ...latestIssueQuery,
      take: LATEST_ISSUE_COUNT,
      where: { articles: { some: {} }, coverImage: { not: null } },
    }),
  ]);

  // Most of the imported issues are still bare records with nothing but a
  // number and a date, so the second tier takes covered issues that have no
  // contents yet.
  const filler =
    withArticles.length < LATEST_ISSUE_COUNT
      ? await prisma.issue.findMany({
          ...latestIssueQuery,
          take: LATEST_ISSUE_COUNT - withArticles.length,
          where: { articles: { none: {} }, coverImage: { not: null } },
        })
      : [];
  // 同一張卡片在首頁與刊系頁該說一樣的話，所以這裡也算得出「已校訂」。
  const latestIssues = [...withArticles, ...filler].map((issue) => ({
    ...issue,
    isVerified: isVerifiedIssue(issue),
  }));

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
              收錄台灣遊戲雜誌的完整目錄資料，透過 AI 辨識技術，
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
                    placeholder="搜尋雜誌、遊戲或文章關鍵字..."
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
                { label: "雜誌", value: magazineCount, icon: BookOpen },
                { label: "單期", value: issueCount, icon: Calendar },
                { label: "文章", value: articleCount, icon: FileText },
                { label: "遊戲", value: gameCount, icon: Gamepad2 },
                { label: "標籤", value: tagCount, icon: Tags },
              ]}
            />
            {/* 涵蓋數跟在單期總數後面講，不另外占兩格：它們不是第六、第七個
                總數，而是「那 N 期裡有多少期收到了東西」。做成一行小字也避開
                StatGrid 的五欄格線——七格在 sm 以上排不成一列。 */}
            {issueCount > 0 && (
              <p className="mt-3 text-center text-sm text-muted-foreground">
                其中 <strong className="font-semibold text-foreground">{coveredCount}</strong> 期有封面
                （{percent(coveredCount, issueCount)}）、
                <strong className="font-semibold text-foreground">{indexedCount}</strong> 期已錄入目錄
                （{percent(indexedCount, issueCount)}）
              </p>
            )}
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
                查看所有雜誌
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
                    // Plain <a>, not <Link>: a soft navigation keeps gtag.js mounted
                    // and GA4 would report an /admin page_view. Hard nav is intended.
                    // eslint-disable-next-line @next/next/no-html-link-for-pages
                    <a href="/admin/magazines" className="text-primary hover:underline">
                      前往後台新增第一本雜誌
                    </a>
                  ) : "資料建置中，請稍後再來"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 stagger-children">
              {latestIssues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  magazineSlug={issue.magazine.slug}
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
