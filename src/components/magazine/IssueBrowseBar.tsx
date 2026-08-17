import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ISSUE_FILTERS,
  ISSUE_SORTS,
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
  counts,
}: {
  basePath: string;
  filter: IssueFilter;
  sort: IssueSort;
  /** Keyed by filter value, so a reader can see what each choice costs. */
  counts: Record<string, number>;
}) {
  // The default of each dimension is left out of the URL, so the unfiltered
  // page keeps the address it has always had.
  const hrefFor = (nextFilter: string, nextSort: string) => {
    const params = new URLSearchParams();
    if (nextFilter !== ISSUE_FILTERS[0].value) params.set("filter", nextFilter);
    if (nextSort !== ISSUE_SORTS[0].value) params.set("sort", nextSort);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-sm transition-colors",
      active
        ? "border-transparent bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">篩選</span>
        {ISSUE_FILTERS.map((option) => (
          <Link
            key={option.value}
            href={hrefFor(option.value, sort.value)}
            className={chip(option.value === filter.value)}
            aria-current={option.value === filter.value ? "page" : undefined}
          >
            {option.label}
            <span className="ml-1.5 tabular-nums opacity-70">
              {counts[option.value]}
            </span>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">排序</span>
        {ISSUE_SORTS.map((option) => (
          <Link
            key={option.value}
            href={hrefFor(filter.value, option.value)}
            className={chip(option.value === sort.value)}
            aria-current={option.value === sort.value ? "page" : undefined}
          >
            {option.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
