import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ISSUE_FILTERS,
  ISSUE_SORTS,
  type IssueDirection,
  type IssueFilter,
  type IssueSort,
} from "@/lib/issue-browse";

/**
 * Filter and sort controls for a magazine's issue list.
 *
 * Links rather than a form: the state lives in the URL, so a filtered view can
 * be shared and the back button returns to the previous one. Being links also
 * keeps the whole thing a server component -- there is nothing to hydrate.
 */
export function IssueBrowseBar({
  basePath,
  filter,
  sort,
  direction,
  counts,
}: {
  basePath: string;
  filter: IssueFilter;
  sort: IssueSort;
  direction: IssueDirection;
  /** Keyed by filter value, so a reader can see what each choice costs. */
  counts: Record<string, number>;
}) {
  // The default of each dimension is left out of the URL, so the unfiltered
  // page keeps the address it has always had.
  const hrefFor = (
    nextFilter: string,
    nextSort: string,
    nextDirection: IssueDirection
  ) => {
    const params = new URLSearchParams();
    if (nextFilter !== ISSUE_FILTERS[0].value) params.set("filter", nextFilter);
    if (nextSort !== ISSUE_SORTS[0].value) params.set("sort", nextSort);
    if (nextDirection !== "desc") params.set("dir", nextDirection);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const chip = (active: boolean) =>
    cn(
      "flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors",
      active
        ? "border-transparent bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  const Arrow = direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">篩選</span>
        {ISSUE_FILTERS.map((option) => (
          <Link
            key={option.value}
            href={hrefFor(option.value, sort.value, direction)}
            className={chip(option.value === filter.value)}
            aria-current={option.value === filter.value ? "page" : undefined}
          >
            {option.label}
            <span className="tabular-nums opacity-70">
              {counts[option.value]}
            </span>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">排序</span>
        {ISSUE_SORTS.map((option) => {
          const active = option.value === sort.value;
          // Clicking the sort you are already on reverses it; picking the other
          // one starts from newest-first rather than carrying the direction
          // over, which would otherwise show 1989 first for no stated reason.
          const nextDirection: IssueDirection = active
            ? direction === "desc"
              ? "asc"
              : "desc"
            : "desc";
          return (
            <Link
              key={option.value}
              href={hrefFor(filter.value, option.value, nextDirection)}
              className={chip(active)}
              aria-current={active ? "page" : undefined}
              title={
                active
                  ? direction === "desc"
                    ? "改為由舊到新"
                    : "改為由新到舊"
                  : undefined
              }
            >
              {option.label}
              {active && <Arrow className="h-3.5 w-3.5" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
