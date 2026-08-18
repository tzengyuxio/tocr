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
