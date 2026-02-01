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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, FileText, BookOpen, Filter } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    magazine?: string;
    category?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || "";
  const magazineId = params.magazine || "";
  const category = params.category || "";
  const page = parseInt(params.page || "1");
  const limit = 20;

  // 取得所有期刊供篩選
  const magazines = await prisma.magazine.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  // 取得所有分類供篩選
  const categories = await prisma.article.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });
  const uniqueCategories = categories
    .map((c) => c.category)
    .filter((c): c is string => c !== null);

  // 建立搜尋條件
  const where: Record<string, unknown> = {};

  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { subtitle: { contains: query, mode: "insensitive" } },
      { summary: { contains: query, mode: "insensitive" } },
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

  // 搜尋文章
  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: [
        { issue: { publishDate: "desc" } },
        { sortOrder: "asc" },
      ],
      skip: (page - 1) * limit,
      take: limit,
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
    }),
    prisma.article.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // 建立 URL 參數
  const buildUrl = (newParams: Record<string, string>) => {
    const urlParams = new URLSearchParams();
    if (query && !("q" in newParams)) urlParams.set("q", query);
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
        <h1 className="text-3xl font-bold">搜尋文章</h1>
        <p className="mt-2 text-muted-foreground">
          在所有期刊文章中搜尋關鍵字
        </p>
      </div>

      {/* Search Form */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <form action="/search" method="get">
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
              <Select name="magazine" defaultValue={magazineId}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="所有期刊" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">所有期刊</SelectItem>
                  {magazines.map((mag) => (
                    <SelectItem key={mag.id} value={mag.id}>
                      {mag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select name="category" defaultValue={category}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="所有分類" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">所有分類</SelectItem>
                  {uniqueCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit">
                <Search className="mr-2 h-4 w-4" />
                搜尋
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Active Filters */}
      {(query || magazineId || category) && (
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
          {magazineId && (
            <Badge variant="secondary">
              期刊：{magazines.find((m) => m.id === magazineId)?.name}
              <Link
                href={buildUrl({ magazine: "" })}
                className="ml-1 hover:text-destructive"
              >
                ×
              </Link>
            </Badge>
          )}
          {category && (
            <Badge variant="secondary">
              分類：{category}
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
        共找到 {total} 篇文章
        {totalPages > 1 && `，第 ${page} / ${totalPages} 頁`}
      </div>

      {/* Results */}
      {articles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-16 w-16 text-muted-foreground/50" />
            <h2 className="mt-4 text-xl font-semibold">找不到相關文章</h2>
            <p className="mt-2 text-muted-foreground">
              {query ? "請嘗試其他關鍵字或調整篩選條件" : "開始輸入關鍵字搜尋"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <Card key={article.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardDescription className="flex items-center gap-2">
                      <BookOpen className="h-3 w-3" />
                      <Link
                        href={`/magazines/${article.issue.magazine.id}`}
                        className="hover:underline"
                      >
                        {article.issue.magazine.name}
                      </Link>
                      <span>·</span>
                      <Link
                        href={`/magazines/${article.issue.magazine.id}/issues/${article.issue.id}`}
                        className="hover:underline"
                      >
                        {article.issue.issueNumber}
                      </Link>
                      <span>·</span>
                      <span>
                        {format(
                          new Date(article.issue.publishDate),
                          "yyyy/MM/dd",
                          { locale: zhTW }
                        )}
                      </span>
                    </CardDescription>
                    <CardTitle className="mt-1 text-lg">
                      <Link
                        href={`/magazines/${article.issue.magazine.id}/issues/${article.issue.id}`}
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
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                    {article.summary}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {article.category && (
                    <Link href={buildUrl({ category: article.category })}>
                      <Badge variant="outline">{article.category}</Badge>
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
                        <Link key={ag.game.id} href={`/games/${ag.game.id}`}>
                          <Badge variant="secondary" className="text-xs">
                            {ag.game.name}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                  {article.articleTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {article.articleTags.map((at) => (
                        <Link key={at.tag.id} href={`/tags/${at.tag.id}`}>
                          <Badge
                            variant="outline"
                            className="text-xs text-muted-foreground"
                          >
                            {at.tag.name}
                          </Badge>
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
