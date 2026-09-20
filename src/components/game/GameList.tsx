import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { displayPlatforms, platformColor } from "@/lib/game-platforms";
import { formatYearRange, type ReportingSummaries } from "@/lib/game-years";
import { formatIssueNumber } from "@/lib/issue-number";

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
 * **「首次報導」寫刊名加期號，不寫年份**：這一欄回答的是「去哪一本的哪一期
 * 翻」，光寫刊名說不出那件事；而年份就是「報導年代」的起點，同一列印兩次是浪費
 * 一整欄的寬度。寫法與 `ArticleListTable` 一致。
 *
 * 這一格不是連結——整列已經是通往遊戲頁的 `<a>`，`<a>` 不能套 `<a>`。
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
        <span className="hidden w-[176px] lg:inline">首次報導</span>
        <span className="hidden w-[150px] sm:inline">平台</span>
        <span className="hidden w-[120px] lg:inline">報導年代</span>
        <span className="w-[64px] text-right">文章數</span>
      </div>

      {rows.map((row) => {
        const platforms = displayPlatforms(row.platforms);
        const summary = summaries.get(row.id);
        const years = formatYearRange(summary?.years);
        const firstSeen = summary
          ? `${summary.firstMagazine} ${formatIssueNumber(summary.firstIssueNumber)}`
          : null;
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
                  {[secondName, firstSeen, years]
                    .filter(Boolean)
                    .join("・")}
                </span>
              )}
            </span>

            <span className="hidden w-[176px] truncate text-sm text-muted-foreground lg:inline">
              {firstSeen ?? "—"}
            </span>

            {/* 平台用家族色的外框籌碼，與遊戲卡片、上方的篩選籌碼同一組值：讀者
                在籌碼上認得的顏色，在列裡要指同一件事。外框不是實心色塊——一頁
                40 列，實心會讓整張表變成花的，而平台只是這一列的第三順位。

                一列只畫三顆，多的收成 `+N`。籌碼不像文字能靠 truncate 切，切一半
                的框看起來像畫壞了。 */}
            <span className="hidden w-[150px] items-center gap-1 overflow-hidden sm:flex">
              {platforms.length > 0 ? (
                <>
                  {platforms.slice(0, 3).map((code) => (
                    <Badge
                      key={code}
                      variant="outline"
                      className="shrink-0 px-1 py-0 text-[10px] font-normal"
                      style={{ color: platformColor(code), borderColor: platformColor(code) }}
                    >
                      {code}
                    </Badge>
                  ))}
                  {platforms.length > 3 && (
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      +{platforms.length - 3}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
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
