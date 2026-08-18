import Link from "next/link";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_MAGAZINE_FILTER,
  MAGAZINE_FILTERS,
  type MagazineFilter,
} from "@/lib/magazine-browse";

/**
 * 期刊列表的分類篩選。
 *
 * 與 IssueBrowseBar 同一個形狀：chip 是 `<Link>`、狀態在網址、整個元件不需要
 * hydrate。這裡沒有排序那一組——列表固定按刊名排，而刊名以外沒有第二種讀法。
 */
export function MagazineBrowseBar({
  basePath,
  filter,
  counts,
}: {
  basePath: string;
  filter: MagazineFilter;
  /** 以 filter 的 value 為 key，讓讀者看得出每個選擇涵蓋多少。 */
  counts: Record<string, number>;
}) {
  const hrefFor = (nextFilter: string) =>
    nextFilter === DEFAULT_MAGAZINE_FILTER
      ? basePath
      : `${basePath}?filter=${nextFilter}`;

  const chip = (active: boolean) =>
    cn(
      "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
      active
        ? "border-transparent bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  // 沒有任何刊物的分類不顯示。Online Game 目前一本都沒有，擺一個永遠是 0 的
  // 按鈕等於給讀者一個按了什麼都不會發生的控制項；等資料進來它自己會出現。
  // 目前選中的那個一定留著，否則從網址進來會看到自己不在列上。
  const visible = MAGAZINE_FILTERS.filter(
    (option) =>
      option.value === DEFAULT_MAGAZINE_FILTER ||
      counts[option.value] > 0 ||
      option.value === filter.value
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <Filter className="h-3.5 w-3.5" />
        分類
      </span>
      {visible.map((option) => (
        <Link
          key={option.value}
          href={hrefFor(option.value)}
          className={chip(option.value === filter.value)}
          aria-current={option.value === filter.value ? "page" : undefined}
        >
          {option.label}
          <span className="tabular-nums opacity-70">{counts[option.value]}</span>
        </Link>
      ))}
    </div>
  );
}
