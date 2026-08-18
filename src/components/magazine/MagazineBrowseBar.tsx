import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowDownUp, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_MAGAZINE_FILTER,
  DEFAULT_MAGAZINE_SORT,
  MAGAZINE_FILTERS,
  MAGAZINE_SORTS,
  type MagazineDirection,
  type MagazineFilter,
  type MagazineSort,
} from "@/lib/magazine-browse";

/**
 * 期刊列表的篩選與排序。
 *
 * 與 IssueBrowseBar 同一個形狀：chip 是 `<Link>`、狀態在網址、整個元件不需要
 * hydrate。
 *
 * 篩選那一組是選用的：前台要分類 chip，後台的期刊管理只要排序。省略時整條列
 * 只剩排序，兩邊仍共用同一份表與同一套網址參數。
 */
export function MagazineBrowseBar({
  basePath,
  filter,
  sort,
  direction,
  counts,
}: {
  basePath: string;
  /** 省略即不顯示分類那一組。 */
  filter?: MagazineFilter;
  sort: MagazineSort;
  direction: MagazineDirection;
  /** 以 filter 的 value 為 key，讓讀者看得出每個選擇涵蓋多少。 */
  counts?: Record<string, number>;
}) {
  // 每一維的預設值都不寫進網址，所以未篩選未排序的頁面保持原本那條乾淨網址。
  const hrefFor = (
    nextFilter: string,
    nextSort: string,
    nextDirection: MagazineDirection
  ) => {
    const params = new URLSearchParams();
    if (filter && nextFilter !== DEFAULT_MAGAZINE_FILTER) params.set("filter", nextFilter);
    if (nextSort !== DEFAULT_MAGAZINE_SORT) params.set("sort", nextSort);
    const sortDefault = MAGAZINE_SORTS.find(
      (option) => option.value === nextSort
    )!.defaultDirection;
    if (nextDirection !== sortDefault) params.set("dir", nextDirection);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const chip = (active: boolean) =>
    cn(
      "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
      active
        ? "border-transparent bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  const Arrow = direction === "asc" ? ArrowUp : ArrowDown;

  // 沒有任何刊物的分類不顯示。Online Game 曾經一本都沒有，擺一個永遠是 0 的
  // 按鈕等於給讀者一個按了什麼都不會發生的控制項；等資料進來它自己會出現。
  // 目前選中的那個一定留著，否則從網址進來會看到自己不在列上。
  const visibleFilters = filter
    ? MAGAZINE_FILTERS.filter(
        (option) =>
          option.value === DEFAULT_MAGAZINE_FILTER ||
          (counts?.[option.value] ?? 0) > 0 ||
          option.value === filter.value
      )
    : [];

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {filter && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            分類
          </span>
          {visibleFilters.map((option) => (
            <Link
              key={option.value}
              href={hrefFor(option.value, sort.value, direction)}
              className={chip(option.value === filter.value)}
              aria-current={option.value === filter.value ? "page" : undefined}
            >
              {option.label}
              <span className="tabular-nums opacity-70">
                {counts?.[option.value]}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowDownUp className="h-3.5 w-3.5" />
          排序
        </span>
        {MAGAZINE_SORTS.map((option) => {
          const active = option.value === sort.value;
          // 點目前這個排序就反轉方向；點另一個則用它自己的預設方向，不把方向
          // 帶過去——否則「創刊日」會變成從最新的刊物讀起。
          const nextDirection: MagazineDirection = active
            ? direction === "desc"
              ? "asc"
              : "desc"
            : option.defaultDirection;
          return (
            <Link
              key={option.value}
              href={hrefFor(filter?.value ?? DEFAULT_MAGAZINE_FILTER, option.value, nextDirection)}
              className={chip(active)}
              aria-current={active ? "page" : undefined}
              title={
                active
                  ? direction === "asc"
                    ? "改為反向排列"
                    : "改為正向排列"
                  : undefined
              }
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
