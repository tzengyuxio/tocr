import Link from "next/link";
import { displayPlatforms } from "@/lib/game-platforms";
import { formatYearRange, type ReportingSummaries } from "@/lib/game-years";

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
 * hydrate 不划算。行動裝置上表格也擠不下五欄，橫向捲軸讀一份索引很難用。
 * 所以是 flex 排的列，窄螢幕只留名稱與文章數，欄位隨寬度逐段出現。
 *
 * 這也是「排序改成點表頭」那條 backlog 在這一頁不適用的原因：沒有 `<th>`。
 * 排序留在上方的 `GameBrowseBar`。
 *
 * 欄位只有兩個斷點：平台在 `sm` 出現，出處與年代一起在 `lg` 出現。**出處與年代
 * 綁同一個斷點是刻意的**——它們兩個也同時是窄螢幕第二行的內容，分開斷的話中間
 * 會有一段寬度把年份印兩次（欄位一次、第二行一次）。
 *
 * **「首次報導」只寫刊名不寫年份**：那個年份就是「報導年代」的起點，同一列裡
 * 印兩次是浪費一整欄的寬度。這一欄回答的是「去哪一本翻」。
 */
export function GameList({
  rows,
  summaries,
}: {
  rows: GameListRow[];
  /** 每一款的報導年代與最早出處，`reportingSummaries()` 算好帶進來。 */
  summaries: ReportingSummaries;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      {/* 表頭是裝飾不是 `<thead>`，所以對讀螢幕的人藏起來——每一列自己就唸得
          完整（遊戲名、出處、平台、年代、幾篇），不需要靠欄位標題對位。 */}
      <div
        className="flex items-center gap-4 border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground"
        aria-hidden
      >
        <span className="flex-1">遊戲名稱</span>
        <span className="hidden w-[150px] lg:inline">首次報導</span>
        <span className="hidden w-[110px] sm:inline">平台</span>
        <span className="hidden w-[120px] lg:inline">報導年代</span>
        <span className="w-[64px] text-right">文章數</span>
      </div>

      {rows.map((row) => {
        const platforms = displayPlatforms(row.platforms);
        const summary = summaries.get(row.id);
        const years = formatYearRange(summary?.years);
        // 原名現在站上只有三筆，但它會隨著補資料長回來（yuxio 2026-09-20），
        // 所以位置留著，沒有值就不佔高度。
        const secondName = row.nameOriginal || row.nameEn;

        return (
          <Link
            key={row.id}
            href={`/games/${row.slug}`}
            className="flex items-center gap-4 border-b px-4 py-2.5 transition-colors last:border-b-0 hover:bg-muted/50"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{row.name}</span>
              {/* 第二行有兩種寫法，互斥。寬螢幕上出處與年代各有自己的欄位，
                  所以那裡只剩原名——而原名站上目前只有三筆，沒有值就整行不畫，
                  不要留一條空的把每一列撐高。窄螢幕沒有欄位可放，就把說得出
                  「這是哪一款」的幾件事併在這一行。 */}
              {secondName && (
                <span className="hidden truncate text-xs text-muted-foreground lg:block">
                  {secondName}
                </span>
              )}
              {(secondName || summary) && (
                <span className="block truncate text-xs text-muted-foreground lg:hidden">
                  {[secondName, summary?.firstMagazine, years]
                    .filter(Boolean)
                    .join("・")}
                </span>
              )}
            </span>

            <span className="hidden w-[150px] truncate text-sm text-muted-foreground lg:inline">
              {summary?.firstMagazine ?? "—"}
            </span>

            <span className="hidden w-[110px] truncate text-sm text-muted-foreground sm:inline">
              {platforms.length > 0 ? platforms.join("、") : "—"}
            </span>

            <span className="hidden w-[120px] text-sm tabular-nums text-muted-foreground lg:inline">
              {years ?? "—"}
            </span>

            <span className="w-[64px] text-right text-sm tabular-nums text-muted-foreground">
              {row.articleCount}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
