import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowDownUp, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_GAME_FILTER,
  DEFAULT_GAME_SORT,
  GAME_FILTERS,
  GAME_SORTS,
  type GameDirection,
  type GameFilter,
  type GameSort,
} from "@/lib/game-browse";

/** What reversing does depends on the sort: a count has ends, a name list has sides. */
function reverseHint(sort: string, direction: GameDirection): string {
  if (sort === "articles") {
    return direction === "desc" ? "改為由少到多" : "改為由多到少";
  }
  return direction === "asc" ? "改為由後往前" : "改為由前往後";
}

/**
 * Filter and sort controls for the game index.
 *
 * The issue list's bar, with one addition: the search box writes to the same
 * URL, so every link here has to carry the current query forward or clicking a
 * sort would silently drop what was typed. Page is deliberately not carried --
 * changing the ordering makes page 4 meaningless.
 */
export function GameBrowseBar({
  basePath,
  query,
  filter,
  sort,
  direction,
  counts,
}: {
  basePath: string;
  query: string;
  filter: GameFilter;
  sort: GameSort;
  direction: GameDirection;
  /** Keyed by filter value, so a reader can see what each choice costs. */
  counts: Record<string, number>;
}) {
  const hrefFor = (
    nextFilter: string,
    nextSort: string,
    nextDirection: GameDirection
  ) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (nextFilter !== DEFAULT_GAME_FILTER) params.set("filter", nextFilter);
    if (nextSort !== DEFAULT_GAME_SORT) params.set("sort", nextSort);
    const sortDefault = GAME_SORTS.find(
      (option) => option.value === nextSort
    )!.defaultDirection;
    if (nextDirection !== sortDefault) params.set("dir", nextDirection);
    const search = params.toString();
    return search ? `${basePath}?${search}` : basePath;
  };

  const chip = (active: boolean) =>
    cn(
      "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
      active
        ? "border-transparent bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  const Arrow = direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          篩選
        </span>
        {GAME_FILTERS.map((option) => (
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
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowDownUp className="h-3.5 w-3.5" />
          排序
        </span>
        {GAME_SORTS.map((option) => {
          const active = option.value === sort.value;
          // Clicking the sort you are already on reverses it; picking the other
          // one starts from that sort's own default.
          const nextDirection: GameDirection = active
            ? direction === "desc"
              ? "asc"
              : "desc"
            : option.defaultDirection;
          return (
            <Link
              key={option.value}
              href={hrefFor(filter.value, option.value, nextDirection)}
              className={chip(active)}
              aria-current={active ? "page" : undefined}
              title={active ? reverseHint(option.value, direction) : undefined}
            >
              {option.label}
              {active && <Arrow className="h-3 w-3" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
