import type { Prisma } from "@prisma/client";
import { nameKey } from "./name-match";
import { PLATFORM_FAMILIES } from "./game-platforms";

/**
 * The ways the game index can be narrowed and ordered.
 *
 * Same shape as issue-browse.ts, and for the same reason: the buttons and the
 * query read one table, so they cannot disagree about what a choice means.
 *
 * 2026-09-20 重想了一輪。原本只有名稱與「多篇報導」兩個維度，理由寫在這裡：
 * 「欄位幾乎都空的，給空的控制項等於沒給」。那句話現在只對了一半——`Game` 自己
 * 的欄位確實還是空的（6,754 款裡封面 45、developer 51、`releaseDate` 0），但
 * **最稠密的那個軸本來就不在 `Game` 上**，在關聯的另一端：這款遊戲是哪幾年的
 * 雜誌寫的。6,735 款有文章的遊戲全都算得出來，涵蓋率 100%。
 *
 * 所以現在的維度是：關鍵字、**報導年代**、平台。
 *
 * - **報導年代**是主軸。對一個雜誌檔案館來說，「1994 年的雜誌在談什麼」比
 *   「這是哪台主機的遊戲」更接近讀者會問的問題，而且它同時畫得出資料密度。
 * - **平台**是次要的軸，因為資料是兩叢的：1,353 筆集中在 cdosgame 的 DOS 遊戲
 *   與《電玩通》2010 年代的主機，中間整段是空的（FC 0、SFC 0、MD 0、PS 1）。
 *   畫面因此要寫明「N 款有資料」，不能讓它讀起來像完整的分面。
 * - **「多篇報導」拿掉了**。它當初是為了「找出跨單期、看橫跨多本雜誌的呈現」
 *   而做的，那時目錄文章還少、符合的遊戲難找；現在 1,914 款有兩篇以上、340 款
 *   跨雜誌，隨手就碰得到，不值得為它留一個控制項。篇數留給排序。
 */

export const GAME_SORTS = [
  // Each sort carries the direction it means first. A name list reads A-to-Z,
  // while "how often was this written about" is only ever asking for the top.
  { value: "name", label: "名稱", defaultDirection: "asc" },
  { value: "articles", label: "相關文章數", defaultDirection: "desc" },
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  defaultDirection: "asc" | "desc";
}>;

/**
 * The index opens on 相關文章數, descending: with 4,821 of 6,754 games sitting on
 * a single article, an A-to-Z first page is a page of games nobody wrote about.
 */
export const DEFAULT_GAME_SORT = "articles";

export const GAME_DIRECTIONS = ["asc", "desc"] as const;

/**
 * 列表與卡片兩種讀法，跟 `/magazines` 的 `?view=list` 同一個做法。
 *
 * **預設是列表**，與雜誌列表相反。那邊的卡片牆裝的是刊頭橫幅，每一張都有；
 * 這邊 6,754 款裡有封面的是 45 款（0.7%），卡片牆等於在展示 6,700 個
 * placeholder。等封面補上來了，把這個預設改回 `cards` 就好。
 */
export const GAME_VIEWS = ["list", "cards"] as const;
export const DEFAULT_GAME_VIEW = "list";

export type GameSort = (typeof GAME_SORTS)[number];
export type GameDirection = (typeof GAME_DIRECTIONS)[number];
export type GameView = (typeof GAME_VIEWS)[number];

/** An unknown value in a hand-edited URL reads as the default, never as 404. */
export function parseGameSort(value: string | undefined): GameSort {
  return (
    GAME_SORTS.find((s) => s.value === value) ??
    GAME_SORTS.find((s) => s.value === DEFAULT_GAME_SORT)!
  );
}

/** Absent means "whichever way this sort reads first", not a fixed direction. */
export function parseGameDirection(
  value: string | undefined,
  sort: GameSort
): GameDirection {
  return GAME_DIRECTIONS.find((d) => d === value) ?? sort.defaultDirection;
}

export function parseGameView(value: string | undefined): GameView {
  return GAME_VIEWS.find((v) => v === value) ?? DEFAULT_GAME_VIEW;
}

/** 一段連續的年份，兩端都含。單一年份就是 `from === to`。 */
export interface YearRange {
  from: number;
  to: number;
}

/**
 * 網址上的 `from`／`to` 讀成一段年份。
 *
 * **框選在本質上只能選連續區間**，而「報導年代」正是一段期間，所以這個限制不是
 * 妥協。要選不連續的年份得改成逐年勾選、網址變成 `?years=1988,2011`，那是另一
 * 種東西，目前想不到需要它的情境。
 *
 * `bounds` 是資料算出來的兩端，不是寫死的常數——站上最早 1988、最晚 2013，但那
 * 會隨匯入移動。超出範圍的值夾回範圍內而不是當成沒填：手改網址打錯一個數字，
 * 讀者看到的應該是最接近的那段期間，不是整個索引。
 */
export function parseYearRange(
  from: string | undefined,
  to: string | undefined,
  bounds: YearRange | null
): YearRange | null {
  if (!bounds) return null;

  const a = parseYear(from, bounds);
  const b = parseYear(to, bounds);
  if (a === null && b === null) return null;

  // 只帶一端時另一端補成同一年——`?from=1999` 讀成「只看 1999」。
  const lo = a ?? b!;
  const hi = b ?? a!;
  return { from: Math.min(lo, hi), to: Math.max(lo, hi) };
}

function parseYear(value: string | undefined, bounds: YearRange): number | null {
  if (!value) return null;
  const year = Number.parseInt(value, 10);
  if (!Number.isFinite(year)) return null;
  return Math.min(bounds.to, Math.max(bounds.from, year));
}

/**
 * 點某一年之後那一段年份會變成什麼。
 *
 * 兩次點擊定起訖，第三次重來：
 *
 * ```
 * 沒選 → 點 1999      → 1999–1999
 * 1999–1999 → 點 1995 → 1995–1999
 * 1995–1999 → 點 1997 → 1997–1997   （點在區間內＝重設）
 * ```
 *
 * 全靠網址，不需要任何 client state——每根長條都是一條 `<Link>`，href 由現在的
 * 區間算出來。所以這一頁到現在還是整條伺服器算好的。
 */
export function yearRangeAfterClick(
  current: YearRange | null,
  year: number
): YearRange {
  if (!current) return { from: year, to: year };
  if (year >= current.from && year <= current.to) return { from: year, to: year };
  return {
    from: Math.min(current.from, year),
    to: Math.max(current.to, year),
  };
}

/**
 * 「這款遊戲在這段期間內被報導過」。
 *
 * 不是「這款遊戲屬於那個年代」——跨年的遊戲會同時落在好幾格，這是刻意的：
 * 《百戰天龍》1989 到 1997 都有人寫，選任何一年都該看得到它。
 *
 * 期別的日期是 `publishSort`（`publishDate` 是 EDTF 字串，排不了序也比不了大小）。
 * 沒有日期的期不會落進任何一段年份，那是對的：不知道哪一年就不該假裝知道。
 */
export function gameYearWhere(range: YearRange | null): Prisma.GameWhereInput {
  if (!range) return {};
  return {
    articleGames: {
      some: {
        article: {
          issue: {
            publishSort: {
              gte: new Date(Date.UTC(range.from, 0, 1)),
              lt: new Date(Date.UTC(range.to + 1, 0, 1)),
            },
          },
        },
      },
    },
  };
}

/**
 * 平台篩選收的是**家族**，不是單一代號。
 *
 * 畫面上寫「PC」，底下要同時算 `DOS`／`WIN`／`PC98`／`APPLE2`——「存細的、顯示
 * 粗的」的篩選那半（見 game-platforms.ts）。其餘代號本身就是讀者認得的寫法，
 * 一個代號就是一個家族。
 */
export function gamePlatformWhere(codes: string[]): Prisma.GameWhereInput {
  if (codes.length === 0) return {};
  const expanded = codes.flatMap((code) => PLATFORM_FAMILIES[code] ?? [code]);
  return { platforms: { hasSome: [...new Set(expanded)] } };
}

/**
 * 網址上的 `platform` 讀成一組顯示用的代號。
 *
 * 逗號分隔、認不得的丟掉、去重。`known` 由呼叫端給——那是「站上真的有資料的
 * 平台」，不是整張 `PLATFORM_CODES`：offering 一個查得到 0 筆的按鈕沒有意義。
 */
export function parsePlatforms(
  value: string | undefined,
  known: readonly string[]
): string[] {
  if (!value) return [];
  const picked = value
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter((code) => known.includes(code));
  return [...new Set(picked)];
}

/**
 * Ordering by article count needs the name as a second key. The counts are a
 * short scale on a long tail -- 4,821 of 6,754 games sit on 1 -- so without a
 * tiebreaker the database is free to return those ties in any order, and a game
 * can appear on two pages or on none. Names tie too (同名不同作的遊戲)，所以
 * 兩種排序都以 id 收尾，讓排序是全序。
 */
export function gameOrderBy(
  sort: GameSort,
  direction: GameDirection
): Prisma.GameOrderByWithRelationInput[] {
  return sort.value === "articles"
    ? [{ articleGames: { _count: direction } }, { name: "asc" }, { id: "asc" }]
    : [{ name: direction }, { id: "asc" }];
}

/** Free-text match across every name a game is known by. */
export function gameSearchWhere(query: string): Prisma.GameWhereInput {
  return {
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { nameEn: { contains: query, mode: "insensitive" } },
      { nameOriginal: { contains: query, mode: "insensitive" } },
      // aliases is an array column, so it matches whole entries only.
      { aliases: { has: query } },
      // The normalised form, so "P.47" finds the entry stored as "P-47". Same
      // key the recognition path matches on -- one ruler, two callers.
      { nameKeys: { has: nameKey(query) } },
    ],
  };
}

/** 這一頁現在在看什麼。每個控制項都拿它算出「按下去會變成什麼」的網址。 */
export interface GameBrowseState {
  query: string;
  years: YearRange | null;
  platforms: string[];
  sort: GameSort;
  direction: GameDirection;
  view: GameView;
}

/**
 * 換掉其中一項之後的網址。
 *
 * 每個控制項都得把其餘的條件帶著走，否則點一下排序就會把讀者打的字丟掉。
 * **`page` 一律不帶**：換了條件或排序之後，第 4 頁指的已經不是同一批東西。
 * 與預設值相同的項目不寫進網址，`/games` 才會是乾淨的那一條。
 */
export function gameBrowseHref(
  basePath: string,
  state: GameBrowseState,
  overrides: Partial<GameBrowseState> = {}
): string {
  const next = { ...state, ...overrides };
  const params = new URLSearchParams();

  if (next.query) params.set("q", next.query);
  if (next.years) {
    params.set("from", String(next.years.from));
    // 單一年份只寫一個參數：`?from=1999` 讀回來就是 1999–1999。
    if (next.years.to !== next.years.from) params.set("to", String(next.years.to));
  }
  if (next.platforms.length > 0) params.set("platform", next.platforms.join(","));
  if (next.sort.value !== DEFAULT_GAME_SORT) params.set("sort", next.sort.value);
  if (next.direction !== next.sort.defaultDirection) params.set("dir", next.direction);
  if (next.view !== DEFAULT_GAME_VIEW) params.set("view", next.view);

  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}
