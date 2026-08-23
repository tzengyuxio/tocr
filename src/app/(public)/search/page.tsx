export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "搜尋",
};
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Search, FileText, BookOpen, Gamepad2, Filter } from "lucide-react";
import { formatEdtf } from "@/lib/edtf";
import {
  ARTICLE_CATEGORIES,
  categoryLabel,
  isArticleCategory,
} from "@/lib/article-categories";
import { CategoryChip, GameChip, TagChip } from "@/components/chips";
import { formatIssueNumber } from "@/lib/issue-number";
import { magazineSubtitle } from "@/lib/magazine-browse";

const PAGE_SIZE = 20;

const RESULT_TYPES = [
  { key: "article", label: "文章" },
  { key: "magazine", label: "雜誌" },
  { key: "game", label: "遊戲" },
] as const;

type ResultType = (typeof RESULT_TYPES)[number]["key"];

function isResultType(value: string): value is ResultType {
  return RESULT_TYPES.some((type) => type.key === value);
}

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    magazine?: string;
    category?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || "";
  const type: ResultType =
    params.type && isResultType(params.type) ? params.type : "article";
  const magazineId = params.magazine === "__all__" ? "" : (params.magazine || "");
  const rawCategory = params.category === "__all__" ? "" : (params.category || "");
  // A hand-edited URL must not reach the enum column with a bad value.
  const category = isArticleCategory(rawCategory) ? rawCategory : "";
  const page = Math.max(1, parseInt(params.page || "1") || 1);

  // 取得所有期刊供篩選
  const magazines = await prisma.magazine.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  // 建立搜尋條件
  const where: Record<string, unknown> = {};

  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { subtitle: { contains: query, mode: "insensitive" } },
      { summary: { contains: query, mode: "insensitive" } },
      { authors: { has: query } },
      { articleGames: { some: { game: { name: { contains: query, mode: "insensitive" } } } } },
      { articleTags: { some: { tag: { name: { contains: query, mode: "insensitive" } } } } },
    ];
  }

  if (magazineId) {
    where.issue = {
      magazineId: magazineId,
    };
  }

  if (category) {
    where.category = category;
  }

  // 期刊與遊戲各自比對自己的名稱欄位；aliases 是陣列，只能整串比對
  const magazineWhere: Prisma.MagazineWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { nameParallel: { contains: query, mode: "insensitive" } },
          { publisher: { contains: query, mode: "insensitive" } },
          { aliases: { has: query } },
          // 歷任刊名也能搜到，命中導向同一個刊系頁——舊刊名不是死路
          { titles: { some: { title: { contains: query, mode: "insensitive" } } } },
        ],
      }
    : {};

  const gameWhere: Prisma.GameWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { nameOriginal: { contains: query, mode: "insensitive" } },
          { nameEn: { contains: query, mode: "insensitive" } },
          { aliases: { has: query } },
        ],
      }
    : {};

  // 三個頁籤都要顯示筆數，所以計數一律全算；只有目前頁籤才抓內容
  const [articleCount, magazineCount, gameCount] = await Promise.all([
    prisma.article.count({ where }),
    prisma.magazine.count({ where: magazineWhere }),
    prisma.game.count({ where: gameWhere }),
  ]);

  const totalOf: Record<ResultType, number> = {
    article: articleCount,
    magazine: magazineCount,
    game: gameCount,
  };
  const total = totalOf[type];
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const skip = (page - 1) * PAGE_SIZE;

  const articles =
    type === "article"
      ? await prisma.article.findMany({
          where,
      // Nulls last: undated issues have no place on a timeline.
          orderBy: [
            { issue: { publishSort: { sort: "desc", nulls: "last" } } },
            { sortOrder: "asc" },
          ],
          skip,
          take: PAGE_SIZE,
          include: {
            issue: {
              select: {
                id: true,
                issueNumber: true,
                slug: true,
                publishDate: true,
                magazine: {
                  select: { id: true, name: true, slug: true },
                },
              },
            },
            articleGames: {
              include: {
                game: {
                  select: { id: true, name: true, slug: true },
                },
              },
            },
            articleTags: {
              include: {
                tag: {
                  select: { id: true, name: true, type: true, slug: true },
                },
              },
            },
          },
        })
      : [];

  const foundMagazines =
    type === "magazine"
      ? await prisma.magazine.findMany({
          where: magazineWhere,
          orderBy: { name: "asc" },
          skip,
          take: PAGE_SIZE,
          include: {
            _count: { select: { issues: true } },
          },
        })
      : [];

  const games =
    type === "game"
      ? await prisma.game.findMany({
          where: gameWhere,
          orderBy: { name: "asc" },
          skip,
          take: PAGE_SIZE,
          include: {
            _count: { select: { articleGames: true } },
          },
        })
      : [];

  // 建立 URL 參數
  const buildUrl = (newParams: Record<string, string>) => {
    const urlParams = new URLSearchParams();
    if (query && !("q" in newParams)) urlParams.set("q", query);
    if (type !== "article" && !("type" in newParams)) urlParams.set("type", type);
    if (magazineId && !("magazine" in newParams))
      urlParams.set("magazine", magazineId);
    if (category && !("category" in newParams))
      urlParams.set("category", category);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) urlParams.set(key, value);
    });
    const paramString = urlParams.toString();
    return paramString ? `/search?${paramString}` : "/search";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">搜尋</h1>
        <p className="mt-2 text-muted-foreground">
          在所有雜誌、遊戲與文章目錄中搜尋關鍵字
        </p>
      </div>

      {/* Search Form */}
      <Card className="mb-6 py-3 gap-0">
        <CardContent>
          <form action="/search" method="get">
            {/* Switching tabs is a link; the form keeps the current one. */}
            {type !== "article" && <input type="hidden" name="type" value={type} />}
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="q"
                  type="text"
                  placeholder="輸入關鍵字搜尋..."
                  defaultValue={query}
                  className="pl-10"
                />
              </div>
              {type === "article" && (
                <>
                  <Select name="magazine" defaultValue={magazineId || "__all__"}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue placeholder="所有雜誌" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">所有雜誌</SelectItem>
                      {magazines.map((mag) => (
                        <SelectItem key={mag.id} value={mag.id}>
                          {mag.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select name="category" defaultValue={category || "__all__"}>
                    <SelectTrigger className="w-full md:w-[150px]">
                      <SelectValue placeholder="所有分類" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">所有分類</SelectItem>
                      {ARTICLE_CATEGORIES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              <Button type="submit">
                <Search className="mr-2 h-4 w-4" />
                搜尋
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Result type tabs */}
      <div className="mb-6 flex flex-wrap gap-1 border-b">
        {RESULT_TYPES.map((resultType) => (
          <Link
            key={resultType.key}
            href={buildUrl({ type: resultType.key, page: "" })}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm transition-colors",
              resultType.key === type
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {resultType.label}
            <span className="ml-1.5 text-xs text-muted-foreground">
              {totalOf[resultType.key]}
            </span>
          </Link>
        ))}
      </div>

      {/* Active Filters */}
      {(query || (type === "article" && (magazineId || category))) && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">篩選條件：</span>
          {query && (
            <Badge variant="secondary">
              關鍵字：{query}
              <Link href={buildUrl({ q: "" })} className="ml-1 hover:text-destructive">
                ×
              </Link>
            </Badge>
          )}
          {type === "article" && magazineId && (
            <Badge variant="secondary">
              雜誌：{magazines.find((m) => m.id === magazineId)?.name}
              <Link
                href={buildUrl({ magazine: "" })}
                className="ml-1 hover:text-destructive"
              >
                ×
              </Link>
            </Badge>
          )}
          {type === "article" && category && (
            <Badge variant="secondary">
              分類：{categoryLabel(category)}
              <Link
                href={buildUrl({ category: "" })}
                className="ml-1 hover:text-destructive"
              >
                ×
              </Link>
            </Badge>
          )}
          <Link href="/search" className="text-sm text-primary hover:underline">
            清除全部
          </Link>
        </div>
      )}

      {/* Results Count */}
      <div className="mb-4 text-sm text-muted-foreground">
        共找到 {total} {type === "article" ? "篇文章" : type === "magazine" ? "本雜誌" : "款遊戲"}
        {totalPages > 1 && `，第 ${page} / ${totalPages} 頁`}
      </div>

      {/* Results */}
      {total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            {type === "magazine" ? (
              <BookOpen className="h-16 w-16 text-muted-foreground/50" />
            ) : type === "game" ? (
              <Gamepad2 className="h-16 w-16 text-muted-foreground/50" />
            ) : (
              <FileText className="h-16 w-16 text-muted-foreground/50" />
            )}
            <h2 className="mt-4 text-xl font-semibold">找不到相關結果</h2>
            <p className="mt-2 text-muted-foreground">
              {query ? "請嘗試其他關鍵字或切換上方的類型" : "開始輸入關鍵字搜尋"}
            </p>
          </CardContent>
        </Card>
      ) : type === "magazine" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {foundMagazines.map((magazine) => (
            <Link key={magazine.id} href={`/magazines/${magazine.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-lg gap-3">
                <CardHeader className="pb-0 gap-1">
                  <div className="mb-2 flex h-20 items-center justify-center rounded-lg bg-muted/50">
                    {magazine.logoImage ? (
                      <Image
                        src={magazine.logoImage}
                        alt={magazine.name}
                        width={300}
                        height={80}
                        unoptimized
                        className="h-16 w-auto object-contain px-3"
                      />
                    ) : (
                      <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                    )}
                  </div>
                  <CardTitle className="line-clamp-1 text-base">
                    {magazine.name}
                  </CardTitle>
                  {magazineSubtitle(magazine.nameParallel, magazine.sourceTitle) && (
                    <CardDescription className="line-clamp-1 text-xs">
                      {magazineSubtitle(magazine.nameParallel, magazine.sourceTitle)}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground text-xs">
                      {magazine.publisher || "未知出版社"}
                    </span>
                    <Badge
                      variant={magazine.isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {magazine._count.issues} 期
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : type === "game" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <Link key={game.id} href={`/games/${game.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-3 p-3">
                  {game.coverImage ? (
                    <Image
                      src={game.coverImage}
                      alt={game.name}
                      width={56}
                      height={56}
                      unoptimized
                      className="h-14 w-14 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Gamepad2 className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium line-clamp-1">{game.name}</div>
                    {(game.nameOriginal || game.nameEn) && (
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {game.nameOriginal || game.nameEn}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {game._count.articleGames} 篇相關文章
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <Card key={article.id} className="transition-shadow hover:shadow-md py-3 gap-2">
              <CardHeader className="pb-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardDescription className="flex items-center gap-2">
                      <BookOpen className="h-3 w-3" />
                      <Link
                        href={`/magazines/${article.issue.magazine.slug}`}
                        className="hover:underline"
                      >
                        {article.issue.magazine.name}
                      </Link>
                      <span>·</span>
                      <Link
                        href={`/magazines/${article.issue.magazine.slug}/issues/${encodeURIComponent(article.issue.slug)}`}
                        className="hover:underline"
                      >
                        {formatIssueNumber(article.issue.issueNumber)}
                      </Link>
                      <span>·</span>
                      <span>
                        {formatEdtf(article.issue.publishDate)}
                      </span>
                    </CardDescription>
                    <CardTitle className="mt-1 text-lg">
                      <Link
                        href={`/magazines/${article.issue.magazine.slug}/issues/${encodeURIComponent(article.issue.slug)}`}
                        className="hover:underline"
                      >
                        {article.title}
                      </Link>
                    </CardTitle>
                    {article.subtitle && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {article.subtitle}
                      </p>
                    )}
                  </div>
                  {article.pageStart && (
                    <div className="ml-4 text-sm text-muted-foreground">
                      p.{article.pageStart}
                      {article.pageEnd && article.pageEnd !== article.pageStart
                        ? `-${article.pageEnd}`
                        : ""}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {article.summary && (
                  <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
                    {article.summary}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {article.category && (
                    <Link href={buildUrl({ category: article.category })}>
                      <CategoryChip category={article.category} />
                    </Link>
                  )}
                  {article.authors.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      作者：{article.authors.join(", ")}
                    </span>
                  )}
                  {article.articleGames.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {article.articleGames.map((ag) => (
                        <Link
                          key={ag.game.id}
                          href={`/games/${ag.game.slug}`}
                          className="transition-opacity hover:opacity-80"
                        >
                          <GameChip name={ag.game.name} className="text-xs" />
                        </Link>
                      ))}
                    </div>
                  )}
                  {article.articleTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {article.articleTags.map((at) => (
                        <Link
                          key={at.tag.id}
                          href={`/tags/${at.tag.slug}`}
                          className="transition-opacity hover:opacity-80"
                        >
                          <TagChip tag={at.tag} className="text-xs" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            asChild={page > 1}
          >
            {page > 1 ? (
              <Link href={buildUrl({ page: String(page - 1) })}>上一頁</Link>
            ) : (
              <span>上一頁</span>
            )}
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "outline"}
                  size="sm"
                  asChild={pageNum !== page}
                >
                  {pageNum !== page ? (
                    <Link href={buildUrl({ page: String(pageNum) })}>
                      {pageNum}
                    </Link>
                  ) : (
                    <span>{pageNum}</span>
                  )}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            asChild={page < totalPages}
          >
            {page < totalPages ? (
              <Link href={buildUrl({ page: String(page + 1) })}>下一頁</Link>
            ) : (
              <span>下一頁</span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
