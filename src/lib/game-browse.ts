import type { Prisma } from "@prisma/client";
import { nameKey } from "./name-match";

/**
 * The ways the game index can be narrowed and ordered.
 *
 * Same shape as issue-browse.ts, and for the same reason: the buttons and the
 * query read one table, so they cannot disagree about what a choice means.
 *
 * Most of what a Game could be filtered by is not filled in yet -- of 624 games
 * in production, one has a cover, one a publisher, and none a platform or a
 * release date. Offering those as controls would be offering empty ones, so the
 * only dimensions here are the two the data actually supports: the name, and
 * how often the game was written about.
 */

export const GAME_FILTERS = [
  { value: "all", label: "全部", minArticles: 0 },
  // 多篇報導 = covered more than once. 481 of 624 games appear in a single
  // article, so this is the cut that separates a passing mention from a game
  // the magazines kept returning to.
  { value: "reported", label: "多篇報導", minArticles: 2 },
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  /** Games are kept when they have at least this many articles; 0 keeps all. */
  minArticles: number;
}>;

/** The index opens on everything: this is a lookup table, not a shelf. */
export const DEFAULT_GAME_FILTER = "all";

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
 * The index opens on 相關文章數, descending: with 481 of 624 games sitting on a
 * single article, an A-to-Z first page is a page of games nobody wrote about.
 */
export const DEFAULT_GAME_SORT = "articles";

export const GAME_DIRECTIONS = ["asc", "desc"] as const;

export type GameFilter = (typeof GAME_FILTERS)[number];
export type GameSort = (typeof GAME_SORTS)[number];
export type GameDirection = (typeof GAME_DIRECTIONS)[number];

/** An unknown value in a hand-edited URL reads as the default, never as 404. */
export function parseGameFilter(value: string | undefined): GameFilter {
  return (
    GAME_FILTERS.find((f) => f.value === value) ??
    GAME_FILTERS.find((f) => f.value === DEFAULT_GAME_FILTER)!
  );
}

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

/**
 * Ordering by article count needs the name as a second key. The counts are a
 * short scale on a long tail -- 481 of 624 games sit on 1 -- so without a
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
