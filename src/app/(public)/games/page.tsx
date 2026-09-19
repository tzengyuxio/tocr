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
import { GameFilterPanel } from "@/components/game/GameFilterPanel";
import { GameList } from "@/components/game/GameList";
import { CoverPlaceholder } from "@/components/CoverPlaceholder";
import {
  gameBrowseHref,
  gamePlatformWhere,
  gameOrderBy,
  gameSearchWhere,
  gameYearWhere,
  parseGameDirection,
  parseGameSort,
  parseGameView,
  parsePlatforms,
  parseYearRange,
  type GameBrowseState,
} from "@/lib/game-browse";
import {
  formatYearRange,
  platformCounts,
  reportingSpans,
  reportingYears,
} from "@/lib/game-years";
import { Gamepad2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { displayPlatforms } from "@/lib/game-platforms";

/**
 * 一頁 50 筆。
 *
 * 原本是 40（卡片四欄十列）。列表一列 44px，50 列剛好是一個捲得完的畫面，而
 * 6,754 款除下來從 169 頁變成 136 頁——這一頁的實際使用者是翻頁的人（正式站
 * 60 天裡 `/games` 的 203 次瀏覽有 36 次落在 `?page=`，而篩選與排序是 0 次），
 * 少三十頁是有感的。卡片檢視共用同一個值，最後一列會少幾張，沒有關係。
 */
const PAGE_SIZE = 50;

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    from?: string;
    to?: string;
    platform?: string;
    sort?: string;
    dir?: string;
    view?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;

  // 年份的兩端與平台清單都是資料算出來的，而且與當下的篩選無關，所以先拿：
  // 網址上的 from／to 要夾回真實範圍內，platform 要對照真的有資料的代號。
  const [{ counts: years, bounds }, platforms] = await Promise.all([
    reportingYears(),
    platformCounts(),
  ]);

  const query = params.q?.trim() || "";
  const sort = parseGameSort(params.sort);
  const state: GameBrowseState = {
    query,
    years: parseYearRange(params.from, params.to, bounds),
    platforms: parsePlatforms(
      params.platform,
      platforms.map((entry) => entry.code)
    ),
    sort,
    direction: parseGameDirection(params.dir, sort),
    view: parseGameView(params.view),
  };
  const page = Math.max(1, parseInt(params.page || "1") || 1);

  const where: Prisma.GameWhereInput = {
    ...(query ? gameSearchWhere(query) : {}),
    ...gameYearWhere(state.years),
    ...gamePlatformWhere(state.platforms),
  };

  const [games, total, platformTotal] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy: gameOrderBy(state.sort, state.direction),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { articleGames: true } } },
    }),
    prisma.game.count({ where }),
    prisma.game.count({ where: { NOT: { platforms: { isEmpty: true } } } }),
  ]);

  // 報導年代只問這一頁的 50 筆，不是整張表。
  const spans = await reportingSpans(games.map((game) => game.id));
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // 分頁連結帶著整組條件走，只換頁碼。
  const pageHref = (nextPage: number) => {
    const base = gameBrowseHref("/games", state);
    if (nextPage <= 1) return base;
    return base.includes("?")
      ? `${base}&page=${nextPage}`
      : `${base}?page=${nextPage}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">遊戲索引</h1>
        <p className="mt-2 text-muted-foreground">
          透過遊戲名稱找到所有相關報導
        </p>
      </div>

      {/* A plain GET form, like /search: the state belongs in the URL, and a
          form submits there without any of this page needing to hydrate.
          每一個篩選條件都要當成 hidden field 跟著送，否則在框裡按 Enter 會把
          讀者選好的年代與平台一起丟掉。 */}
      <form action="/games" method="get" className="mb-4 max-w-md">
        {state.years && (
          <>
            <input type="hidden" name="from" value={state.years.from} />
            {state.years.to !== state.years.from && (
              <input type="hidden" name="to" value={state.years.to} />
            )}
          </>
        )}
        {state.platforms.length > 0 && (
          <input type="hidden" name="platform" value={state.platforms.join(",")} />
        )}
        {params.sort && <input type="hidden" name="sort" value={params.sort} />}
        {params.dir && <input type="hidden" name="dir" value={params.dir} />}
        {params.view && <input type="hidden" name="view" value={params.view} />}
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

      <div className="mb-4">
        <GameFilterPanel
          basePath="/games"
          state={state}
          years={years}
          platforms={platforms}
          platformTotal={platformTotal}
        />
      </div>

      <div className="mb-5">
        <GameBrowseBar basePath="/games" state={state} total={total} />
      </div>

      {games.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Gamepad2 className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-xl font-semibold">
            {query || state.years || state.platforms.length > 0
              ? "找不到符合的遊戲"
              : "尚無遊戲資料"}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {query || state.years || state.platforms.length > 0
              ? "請放寬條件或換個關鍵字"
              : "資料建置中，敬請期待"}
          </p>
        </div>
      ) : (
        <>
          {state.view === "list" ? (
            <GameList
              rows={games.map((game) => ({
                id: game.id,
                name: game.name,
                slug: game.slug,
                nameOriginal: game.nameOriginal,
                nameEn: game.nameEn,
                platforms: game.platforms,
                articleCount: game._count.articleGames,
              }))}
              spans={spans}
            />
          ) : (
            /* Four across, not five: the card is a row, not a tile, and at five
               the text column falls to ~148px -- narrower than "N 篇相關文章"
               plus two platform badges, so the meta line wraps. */
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {games.map((game) => (
                <Link key={game.id} href={`/games/${game.slug}`}>
                  {/* py-0：`Card` 預設帶 `py-5`，卡片因此比內容高出 42px。縮圖還是
                      56px 方框時文字區撐得比較滿、看不太出來，換成 72×96 之後那段
                      留白就明顯了（量到 Card 162 / 內容 120 / 圖 96 / 文字 44）。
                      要收的是 Card 自己的 padding，不是圖——圖沒有 margin。 */}
                  <Card className="h-full py-0 transition-shadow hover:shadow-md">
                    <CardContent className="flex items-center gap-3 p-3">
                      {/* 3:4 and 72px wide, the same shape the game page gives a
                          cover: a box shot cropped into a square loses its title.
                          Past 64px the lucide icon is too small a stand-in, so
                          the missing-cover slot switches to CoverPlaceholder. */}
                      {game.coverImage ? (
                        <Image
                          src={game.coverImage}
                          alt={game.name}
                          width={72}
                          height={96}
                          unoptimized
                          className="h-24 w-[4.5rem] shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <CoverPlaceholder
                          kind="game"
                          className="w-[4.5rem] shrink-0 rounded-md"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium line-clamp-1">{game.name}</div>
                        {(game.nameOriginal || game.nameEn) && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {game.nameOriginal || game.nameEn}
                          </div>
                        )}
                        {/* 報導年代放在文章數上面：先說「哪個年代的」再說「寫了幾篇」，
                            與列表檢視同一個順序。 */}
                        {formatYearRange(spans.get(game.id)) && (
                          <div className="text-xs tabular-nums text-muted-foreground">
                            {formatYearRange(spans.get(game.id))}
                          </div>
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {game._count.articleGames} 篇相關文章
                          </span>
                          {displayPlatforms(game.platforms).slice(0, 2).map((p) => (
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
          )}

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
