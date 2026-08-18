import Image from "next/image";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GameBrowseBar } from "@/components/game/GameBrowseBar";
import {
  GAME_FILTERS,
  gameOrderBy,
  gameSearchWhere,
  parseGameDirection,
  parseGameFilter,
  parseGameSort,
} from "@/lib/game-browse";
import { Gamepad2, Search, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 40;

/**
 * Games at least this often are what 多篇報導 keeps. Prisma cannot filter on a
 * relation's count, so the ids are gathered first and fed back in as an `in`
 * list -- fine at this scale (624 games), and the alternative is raw SQL.
 */
async function gamesWithAtLeast(minArticles: number): Promise<string[]> {
  const rows = await prisma.articleGame.groupBy({
    by: ["gameId"],
    _count: { gameId: true },
    having: { gameId: { _count: { gte: minArticles } } },
  });
  return rows.map((row) => row.gameId);
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    filter?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() || "";
  const filter = parseGameFilter(params.filter);
  const sort = parseGameSort(params.sort);
  const direction = parseGameDirection(params.dir, sort);
  const page = Math.max(1, parseInt(params.page || "1") || 1);

  const searchWhere = query ? gameSearchWhere(query) : {};

  // One id list serves both the filtered query and the chip counts, so the
  // number on the button is the number of results the button leads to.
  const reportedIds = await gamesWithAtLeast(2);
  const whereFor = (minArticles: number): Prisma.GameWhereInput => ({
    ...searchWhere,
    ...(minArticles > 0 ? { id: { in: reportedIds } } : {}),
  });

  const where = whereFor(filter.minArticles);

  const [games, total, counts] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy: gameOrderBy(sort, direction),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { articleGames: true } } },
    }),
    prisma.game.count({ where }),
    Promise.all(
      GAME_FILTERS.map((option) =>
        prisma.game.count({ where: whereFor(option.minArticles) })
      )
    ),
  ]);

  const filterCounts = Object.fromEntries(
    GAME_FILTERS.map((option, i) => [option.value, counts[i]])
  );
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Everything but the page number, so a pager link keeps the current view.
  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (params.filter) next.set("filter", params.filter);
    if (params.sort) next.set("sort", params.sort);
    if (params.dir) next.set("dir", params.dir);
    if (nextPage > 1) next.set("page", String(nextPage));
    const search = next.toString();
    return search ? `/games?${search}` : "/games";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">遊戲索引</h1>
        <p className="mt-2 text-muted-foreground">
          透過遊戲名稱找到所有相關報導
        </p>
      </div>

      {/* A plain GET form, like /search: the state belongs in the URL, and a
          form submits there without any of this page needing to hydrate.
          Filter and sort ride along as hidden fields so searching does not
          throw away the view that was set up around it. */}
      <form action="/games" method="get" className="mb-4 max-w-md">
        {params.filter && <input type="hidden" name="filter" value={params.filter} />}
        {params.sort && <input type="hidden" name="sort" value={params.sort} />}
        {params.dir && <input type="hidden" name="dir" value={params.dir} />}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            placeholder="搜尋遊戲..."
            defaultValue={query}
            className="pl-9"
          />
        </div>
      </form>

      <div className="mb-6">
        <GameBrowseBar
          basePath="/games"
          query={query}
          filter={filter}
          sort={sort}
          direction={direction}
          counts={filterCounts}
        />
      </div>

      {games.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Gamepad2 className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-xl font-semibold">
            {query ? "找不到符合的遊戲" : "尚無遊戲資料"}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {query ? "請嘗試其他關鍵字" : "資料建置中，敬請期待"}
          </p>
        </div>
      ) : (
        <>
          {/* Four across, not five: the card is a row, not a tile, and at five
              the text column falls to ~148px -- narrower than "N 篇相關文章"
              plus two platform badges, so the meta line wraps. */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {game._count.articleGames} 篇相關文章
                        </span>
                        {game.platforms.slice(0, 2).map((p) => (
                          <Badge key={p} variant="outline" className="text-[10px] px-1 py-0">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <PagerLink
                href={pageHref(page - 1)}
                disabled={page <= 1}
                label="上一頁"
                side="prev"
              />
              <span className="text-sm text-muted-foreground">
                第 {page} / {totalPages} 頁（共 {total} 款遊戲）
              </span>
              <PagerLink
                href={pageHref(page + 1)}
                disabled={page >= totalPages}
                label="下一頁"
                side="next"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** A link that has to look and behave like the outline Button it replaces. */
function PagerLink({
  href,
  disabled,
  label,
  side,
}: {
  href: string;
  disabled: boolean;
  label: string;
  side: "prev" | "next";
}) {
  const className = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    disabled && "pointer-events-none opacity-50"
  );
  // aria-disabled rather than removing the link: a disabled control still needs
  // to be findable by a screen reader at either end of the run.
  return (
    <Link href={href} className={className} aria-disabled={disabled} tabIndex={disabled ? -1 : undefined}>
      {side === "prev" && <ChevronLeft className="mr-1 h-4 w-4" />}
      {label}
      {side === "next" && <ChevronRight className="ml-1 h-4 w-4" />}
    </Link>
  );
}
