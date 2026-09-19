import Link from "next/link";
import { displayPlatforms } from "@/lib/game-platforms";
import { formatYearRange, type ReportingSpans } from "@/lib/game-years";

export interface GameListRow {
  id: string;
  name: string;
  slug: string;
  nameOriginal: string | null;
  nameEn: string | null;
  platforms: string[];
  articleCount: number;
}

/**
 * 遊戲索引的列表檢視。
 *
 * **沒有用 `<Table>`**，理由與 `MagazineList` 那邊同一條：那個元件是
 * `"use client"`，而這一頁整條都是伺服器算好的，為了畫幾條線把整頁的列送去
 * hydrate 不划算。行動裝置上表格也擠不下四欄，橫向捲軸讀一份索引很難用。
 * 所以是 flex 排的列，窄螢幕只留名稱與文章數，欄位隨寬度逐段出現。
 *
 * 這也是「排序改成點表頭」那條 backlog 在這一頁不適用的原因：沒有 `<th>`。
 * 排序留在上方的 `GameBrowseBar`。
 */
export function GameList({
  rows,
  spans,
}: {
  rows: GameListRow[];
  /** 每一款的報導年代，`reportingSpans()` 算好帶進來。 */
  spans: ReportingSpans;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      {/* 表頭是裝飾不是 `<thead>`，所以對讀螢幕的人藏起來——每一列自己就唸得
          完整（遊戲名、平台、年代、幾篇），不需要靠欄位標題對位。 */}
      <div
        className="flex items-center gap-4 border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground"
        aria-hidden
      >
        <span className="flex-1">遊戲名稱</span>
        <span className="hidden w-[120px] sm:inline">平台</span>
        <span className="hidden w-[132px] md:inline">報導年代</span>
        <span className="w-[72px] text-right">文章數</span>
      </div>

      {rows.map((row) => {
        const platforms = displayPlatforms(row.platforms);
        const years = formatYearRange(spans.get(row.id));
        const secondName = row.nameOriginal || row.nameEn;

        return (
          <Link
            key={row.id}
            href={`/games/${row.slug}`}
            className="flex items-center gap-4 border-b px-4 py-2.5 transition-colors last:border-b-0 hover:bg-muted/50"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{row.name}</span>
              {/* 原名與年代在窄螢幕降到第二行：那裡沒有欄位可放，但它們是
                  一列裡最說得出「這是哪一款」的兩件事。 */}
              <span className="block truncate text-xs text-muted-foreground">
                {secondName}
                {secondName && years && <span className="md:hidden">・</span>}
                {years && <span className="md:hidden tabular-nums">{years}</span>}
              </span>
            </span>

            <span className="hidden w-[120px] truncate text-sm text-muted-foreground sm:inline">
              {platforms.length > 0 ? platforms.join("、") : "—"}
            </span>

            <span className="hidden w-[132px] text-sm tabular-nums text-muted-foreground md:inline">
              {years ?? "—"}
            </span>

            <span className="w-[72px] text-right text-sm tabular-nums text-muted-foreground">
              {row.articleCount}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
