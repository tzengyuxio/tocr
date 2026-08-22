import type { Prisma } from "@prisma/client";

/**
 * The ways a magazine's issue list can be narrowed and ordered.
 *
 * The tables live here rather than in the component so the query and the
 * buttons cannot disagree about what "有目錄" means -- the same mistake
 * PENDING_REVIEW_WHERE exists to prevent for the review queue.
 *
 * The defaults are named rather than taken from the first entry, so the order
 * the buttons appear in stays a display decision: 全部 reads first even though
 * 有封面 is what the page opens with. Whatever is default is the thing the URL
 * leaves out, so a plain /magazines/<slug> stays the address people share.
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

/**
 * The shelf opens on the issues that have a cover, because a wall of
 * placeholder icons says nothing about the magazine. 全部 is one click away and
 * the counts on the buttons say what is being left out.
 */
export const DEFAULT_ISSUE_FILTER = "cover";

export const ISSUE_SORTS = [
  // `order` and not the date: not every issue states one, and a run with a few
  // undated issues in it still has an order everyone agrees on. Ordering by
  // the issue number would put "10" before "9"; ordering by the date leaves
  // the undated ones in a heap at one end.
  //
  // Each sort carries the direction it means first: a run of a magazine reads
  // from its first issue forward, while "recently updated" is only ever asking
  // what changed last.
  { value: "order", label: "刊期順序", field: "order", defaultDirection: "asc" },
  { value: "updated", label: "最近更新", field: "updatedAt", defaultDirection: "desc" },
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  field: keyof Prisma.IssueOrderByWithRelationInput;
  defaultDirection: "asc" | "desc";
}>;

// An older ?sort=date link falls through parseIssueSort to this, which is the
// same run in the same direction -- the ruler changed, not the reading.
export const DEFAULT_ISSUE_SORT = "order";

export const ISSUE_DIRECTIONS = ["asc", "desc"] as const;

export type IssueFilter = (typeof ISSUE_FILTERS)[number];
export type IssueSort = (typeof ISSUE_SORTS)[number];
export type IssueDirection = (typeof ISSUE_DIRECTIONS)[number];

/** An unknown value in a hand-edited URL reads as the default, never as 404. */
export function parseIssueFilter(value: string | undefined): IssueFilter {
  return (
    ISSUE_FILTERS.find((f) => f.value === value) ??
    ISSUE_FILTERS.find((f) => f.value === DEFAULT_ISSUE_FILTER)!
  );
}

export function parseIssueSort(value: string | undefined): IssueSort {
  return (
    ISSUE_SORTS.find((s) => s.value === value) ??
    ISSUE_SORTS.find((s) => s.value === DEFAULT_ISSUE_SORT)!
  );
}

/** Absent means "whichever way this sort reads first", not a fixed direction. */
export function parseIssueDirection(
  value: string | undefined,
  sort: IssueSort
): IssueDirection {
  return ISSUE_DIRECTIONS.find((d) => d === value) ?? sort.defaultDirection;
}

export function issueOrderBy(
  sort: IssueSort,
  direction: IssueDirection
): Prisma.IssueOrderByWithRelationInput {
  return { [sort.field]: direction };
}
