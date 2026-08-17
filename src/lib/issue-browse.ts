import type { Prisma } from "@prisma/client";

/**
 * The ways a magazine's issue list can be narrowed and ordered.
 *
 * The tables live here rather than in the component so the query and the
 * buttons cannot disagree about what "有目錄" means -- the same mistake
 * PENDING_REVIEW_WHERE exists to prevent for the review queue.
 *
 * The first entry of each table is the default, and the one the URL leaves
 * out: a plain /magazines/<slug> has to keep meaning what it meant before
 * these existed.
 */

export const ISSUE_FILTERS = [
  { value: "all", label: "全部", where: {} },
  { value: "cover", label: "有封面", where: { coverImage: { not: null } } },
  // 有目錄 = 有文章。An issue with scans but no articles yet has not been
  // recognised, so from a reader's side it has no table of contents.
  { value: "toc", label: "有目錄", where: { articles: { some: {} } } },
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  where: Prisma.IssueWhereInput;
}>;

export const ISSUE_SORTS = [
  // Ordering by the issue number would order "10" before "9"; the publish date
  // is what the number stands for anyway, and it is already indexed.
  { value: "date", label: "出版日期", orderBy: { publishSort: "desc" } },
  { value: "updated", label: "最近更新", orderBy: { updatedAt: "desc" } },
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  orderBy: Prisma.IssueOrderByWithRelationInput;
}>;

export type IssueFilter = (typeof ISSUE_FILTERS)[number];
export type IssueSort = (typeof ISSUE_SORTS)[number];

/** An unknown value in a hand-edited URL reads as the default, never as 404. */
export function parseIssueFilter(value: string | undefined): IssueFilter {
  return ISSUE_FILTERS.find((f) => f.value === value) ?? ISSUE_FILTERS[0];
}

export function parseIssueSort(value: string | undefined): IssueSort {
  return ISSUE_SORTS.find((s) => s.value === value) ?? ISSUE_SORTS[0];
}
