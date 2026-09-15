import type { Prisma } from "@prisma/client";

/**
 * `/games/<game>` 與 `/tags/<tag>` 列的是同一種東西——這個遊戲或標籤出現在哪些
 * 文章——所以排序的定義住在這裡，兩頁共用。兩頁的表格曾經各長各的（一邊把刊期
 * 併成一欄、一邊拆成兩欄，頁碼只有一邊有），共用一份定義才不會再漂開。
 *
 * 掛點不同（ArticleGame 與 ArticleTag），但排序都是穿過 `article` 走到 `issue`，
 * 所以回傳的形狀對兩邊都適用。
 */

export const ARTICLE_SORTS = [
  // 出版日期是預設：跨刊時它是唯一能把不同雜誌放在同一條時間軸上的排法。
  // 由新到舊，因為「這款遊戲最後一次被寫到是什麼時候」比創刊那年更常被問。
  { value: "date", label: "出版日期", defaultDirection: "desc" },
  // 刊期序在跨刊時得先決定雜誌怎麼排，這裡取刊名——它至少是穩定的，而按刊名
  // 聚在一起也正好是「同一本刊裡的先後」這個問題想看的形狀。
  { value: "issue", label: "刊期", defaultDirection: "asc" },
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  defaultDirection: "asc" | "desc";
}>;

export const ARTICLE_DIRECTIONS = ["asc", "desc"] as const;

export const DEFAULT_ARTICLE_SORT = "date";

export type ArticleSort = (typeof ARTICLE_SORTS)[number];
export type ArticleDirection = (typeof ARTICLE_DIRECTIONS)[number];

/** 手改網址裡的未知值讀成預設，不是 404。 */
export function parseArticleSort(value: string | undefined): ArticleSort {
  return (
    ARTICLE_SORTS.find((s) => s.value === value) ??
    ARTICLE_SORTS.find((s) => s.value === DEFAULT_ARTICLE_SORT)!
  );
}

/** 沒指定方向時，取這個排序讀起來自然的那一邊，而不是固定的 asc。 */
export function parseArticleDirection(
  value: string | undefined,
  sort: ArticleSort
): ArticleDirection {
  return ARTICLE_DIRECTIONS.find((d) => d === value) ?? sort.defaultDirection;
}

/** 點同一欄是換方向，點另一欄是換排序、方向回到那一欄的預設。 */
export function nextDirection(
  column: ArticleSort,
  sort: ArticleSort,
  direction: ArticleDirection
): ArticleDirection {
  if (column.value !== sort.value) return column.defaultDirection;
  return direction === "asc" ? "desc" : "asc";
}

export function articleOrderBy(
  sort: ArticleSort,
  direction: ArticleDirection
): { article: Prisma.ArticleOrderByWithRelationInput }[] {
  if (sort.value === "issue") {
    return [
      { article: { issue: { magazine: { name: direction } } } },
      { article: { issue: { order: direction } } },
    ];
  }
  // 沒寫出版日期的期沒有時間軸上的位置，一律墊底——Postgres 預設會把它們排在
  // 最前面，那是整頁最沒有資訊的東西佔住最好的位置。
  return [
    { article: { issue: { publishSort: { sort: direction, nulls: "last" } } } },
  ];
}
