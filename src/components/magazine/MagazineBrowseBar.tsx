import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowDownUp, Filter, LayoutGrid, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_MAGAZINE_FILTER,
  DEFAULT_MAGAZINE_SORT,
  DEFAULT_MAGAZINE_VIEW,
  MAGAZINE_FILTERS,
  MAGAZINE_SORTS,
  type MagazineDirection,
  type MagazineFilter,
  type MagazineSort,
  type MagazineView,
} from "@/lib/magazine-browse";

/** 圖示與說明放這裡而不是 magazine-browse.ts：那份表要能被伺服器端的查詢讀，
    塞進 lucide 元件會把圖示庫拖進每一個 import 它的地方。 */
const VIEW_OPTIONS = [
  { value: "grid", label: "卡片檢視", icon: LayoutGrid },
  { value: "list", label: "列表檢視", icon: Rows3 },
] as const satisfies ReadonlyArray<{
  value: MagazineView;
  label: string;
  icon: typeof LayoutGrid;
}>;

/**
 * 期刊列表的篩選與排序。
 *
 * 與 IssueBrowseBar 同一個形狀：chip 是 `<Link>`、狀態在網址、整個元件不需要
 * hydrate。
 *
 * 篩選與檢視兩組都是選用的：前台要分類 chip 與卡片／列表切換，後台的期刊管理
 * 只要排序。省略時整條列只剩排序，兩邊仍共用同一份表與同一套網址參數。
 */
export function MagazineBrowseBar({
  basePath,
  filter,
  sort,
  sorts = MAGAZINE_SORTS,
  direction,
  view,
  counts,
}: {
  basePath: string;
  /** 省略即不顯示分類那一組。 */
  filter?: MagazineFilter;
  sort: MagazineSort;
  /** 可選的排序，後台傳 ADMIN_MAGAZINE_SORTS 多一種「建立日期」。 */
  sorts?: ReadonlyArray<MagazineSort>;
  direction: MagazineDirection;
  /** 省略即不顯示卡片／列表切換。 */
  view?: MagazineView;
  /** 以 filter 的 value 為 key，讓讀者看得出每個選擇涵蓋多少。 */
  counts?: Record<string, number>;
}) {
  // 每一維的預設值都不寫進網址，所以未篩選未排序的頁面保持原本那條乾淨網址。
  const hrefFor = (
    nextFilter: string,
    nextSort: string,
    nextDirection: MagazineDirection,
    nextView: MagazineView | undefined = view
  ) => {
    const params = new URLSearchParams();
    if (filter && nextFilter !== DEFAULT_MAGAZINE_FILTER) params.set("filter", nextFilter);
    if (nextSort !== DEFAULT_MAGAZINE_SORT) params.set("sort", nextSort);
    const sortDefault = sorts.find(
      (option) => option.value === nextSort
    )!.defaultDirection;
    if (nextDirection !== sortDefault) params.set("dir", nextDirection);
    if (nextView && nextView !== DEFAULT_MAGAZINE_VIEW) params.set("view", nextView);
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
        {sorts.map((option) => {
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

      {/* 切換擺在最右邊、與篩選排序同一條：它改的是同一份清單怎麼呈現，不是
          清單裝了什麼，所以不值得另起一列，但也不該混在 chip 中間讀成第三種
          篩選。ml-auto 在換行時會失效並排到下一列的開頭，那正好。 */}
      {view && (
        <div className="flex items-center gap-1 sm:ml-auto">
          {VIEW_OPTIONS.map((option) => {
            const active = option.value === view;
            const Icon = option.icon;
            return (
              <Link
                key={option.value}
                href={hrefFor(
                  filter?.value ?? DEFAULT_MAGAZINE_FILTER,
                  sort.value,
                  direction,
                  option.value
                )}
                className={cn(
                  "rounded-md border p-1.5 transition-colors",
                  active
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
                aria-label={option.label}
                title={option.label}
              >
                <Icon className="h-4 w-4" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
