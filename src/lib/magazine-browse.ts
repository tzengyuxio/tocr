import type { Prisma } from "@prisma/client";

/**
 * 期刊列表的分類篩選。
 *
 * 與 issue-browse.ts、game-browse.ts 同一個形狀：表放這裡，按鈕與查詢讀同一份，
 * 所以兩者不會對「TV Game 是什麼」有不同意見。
 *
 * 類別本身來自 nostalibrary 的分節，見 prisma/schema.prisma 的 MagazineCategory。
 */

/** enum 的值，給 validator 與後台表單用；順序即畫面上的順序。 */
export const MAGAZINE_CATEGORY_VALUES = ["PC_GAME", "TV_GAME", "ONLINE_GAME"] as const;

export type MagazineCategory = (typeof MAGAZINE_CATEGORY_VALUES)[number];

/**
 * 標籤沿用上游的英文分節名而不譯成中文：這幾個詞是這批雜誌既有的分類名稱，
 * 讀者在 nostalibrary 上看到的也是它們，兩站用同一組字比較好對照。
 */
export const MAGAZINE_CATEGORY_LABELS: Record<MagazineCategory, string> = {
  PC_GAME: "PC Game",
  TV_GAME: "TV Game",
  ONLINE_GAME: "Online Game",
};

export const MAGAZINE_FILTERS = [
  { value: "all", label: "全部", where: {} },
  ...MAGAZINE_CATEGORY_VALUES.map((category) => ({
    value: category.toLowerCase().replace("_game", ""),
    label: MAGAZINE_CATEGORY_LABELS[category],
    where: { categories: { has: category } },
  })),
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  where: Prisma.MagazineWhereInput;
}>;

/** 列表是索引，開在全部；分類是收窄用的，不是預設視角。 */
export const DEFAULT_MAGAZINE_FILTER = "all";

export type MagazineFilter = (typeof MAGAZINE_FILTERS)[number];

/** 手改網址帶進未知值時讀成預設，不是 404。 */
export function parseMagazineFilter(value: string | undefined): MagazineFilter {
  return (
    MAGAZINE_FILTERS.find((f) => f.value === value) ??
    MAGAZINE_FILTERS.find((f) => f.value === DEFAULT_MAGAZINE_FILTER)!
  );
}

export const MAGAZINE_SORTS = [
  // 各自帶著自己讀起來順的方向：刊名清單從 A 讀到 Z，而一整排刊物是從最早的
  // 那本讀起——與 ISSUE_SORTS 的出版日期同一個道理。
  { value: "name", label: "名稱", defaultDirection: "asc" },
  { value: "founded", label: "創刊日", defaultDirection: "asc" },
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  defaultDirection: "asc" | "desc";
}>;

/**
 * 後台多一種「建立日期」。它是這頁原本的預設順序，用途是「剛才建的那本在哪」
 * ——那是編輯才有的問題，讀者不關心一筆資料是什麼時候被輸入的，所以不放進
 * 前台那組。
 */
export const ADMIN_MAGAZINE_SORTS = [
  ...MAGAZINE_SORTS,
  { value: "created", label: "建立日期", defaultDirection: "desc" },
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  defaultDirection: "asc" | "desc";
}>;

export const DEFAULT_MAGAZINE_SORT = "name";

export const MAGAZINE_DIRECTIONS = ["asc", "desc"] as const;

export type MagazineSort = (typeof ADMIN_MAGAZINE_SORTS)[number];
export type MagazineDirection = (typeof MAGAZINE_DIRECTIONS)[number];

/**
 * `sorts` 決定哪些值算數：前台傳預設那組，所以 `?sort=created` 在前台會退回
 * 名稱，而不是露出一個那頁沒有的按鈕。
 */
export function parseMagazineSort(
  value: string | undefined,
  sorts: ReadonlyArray<MagazineSort> = MAGAZINE_SORTS
): MagazineSort {
  return (
    sorts.find((s) => s.value === value) ??
    sorts.find((s) => s.value === DEFAULT_MAGAZINE_SORT)!
  );
}

/** 沒指定時用該排序自己讀起來順的方向，不是固定一個。 */
export function parseMagazineDirection(
  value: string | undefined,
  sort: MagazineSort
): MagazineDirection {
  return MAGAZINE_DIRECTIONS.find((d) => d === value) ?? sort.defaultDirection;
}

/**
 * 創刊日排的是 `foundedSort` 不是 `foundedDate`：後者是 EDTF 字串，「1999-05」
 * 與「1994」直接比字串會把年份較小的排在後面。衍生欄位存的是該值涵蓋區間的
 * 起點，本來就是為了排序而存在的。
 *
 * 沒有創刊日的排在最後（34 本裡有 2 本），否則一片空白會頂在最前面；名稱當
 * 第二鍵，讓同月創刊的刊物有穩定順序。
 */
export function magazineOrderBy(
  sort: MagazineSort,
  direction: MagazineDirection
): Prisma.MagazineOrderByWithRelationInput[] {
  if (sort.value === "founded") {
    return [{ foundedSort: { sort: direction, nulls: "last" } }, { name: "asc" }];
  }
  if (sort.value === "created") return [{ createdAt: direction }];
  return [{ name: direction }];
}
