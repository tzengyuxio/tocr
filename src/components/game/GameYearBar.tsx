"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  gameBrowseHref,
  yearRangeAfterClick,
  type GameBrowseState,
  type YearRange,
} from "@/lib/game-browse";
import type { YearCount } from "@/lib/game-years";

/** 最高的那一根有多高。低於一格的年份仍畫得出來，見 `barHeight()`。 */
const BAR_MAX_PX = 56;

/**
 * 報導年代的逐年長條：它同時是篩選器與資料密度圖。
 *
 * **可以拖，也可以點。**兩種都留著，因為它們回答的不是同一個問題：
 *
 * - **拖**——按住掃過幾年再放手，直接選那一段。手機上這是唯一能用的方式：390px
 *   分給 26 個年份，一根長條只有 8.7px（量過），點不準；但拖的時候選到哪幾年是
 *   一路看得到的，放手前還能調，精準度就不靠手指了。
 * - **點**——兩次點擊定起訖，第三次重來（`yearRangeAfterClick`）。桌機上想從
 *   1995 選到 1999 不必真的掃過去。
 *
 * **每根長條都是 `<a href>`，拖曳是加上去的。**所以沒有 JS、或還沒 hydrate 的
 * 時候這個控制項照樣能用，爬蟲也走得進每一個年份——這是漸進增強，不是把一個
 * 本來就會動的東西改寫成只有 JS 才動。
 *
 * `touch-action: pan-y` 讓橫向的手勢歸這裡、直向的仍然捲頁面；沒有這一行，
 * 在手機上一拖就變成捲動，選不到東西。
 */
export function GameYearBar({
  basePath,
  state,
  years,
}: {
  basePath: string;
  state: GameBrowseState;
  years: YearCount[];
}) {
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement>(null);
  /** 按下去的那一年。null 代表現在沒有人在拖。 */
  const [anchor, setAnchor] = useState<number | null>(null);
  /** 拖到現在為止會選出哪一段；放手前畫面照這個顯示，不動網址。 */
  const [preview, setPreview] = useState<YearRange | null>(null);

  const most = Math.max(...years.map((y) => y.games), 1);
  const shown = preview ?? state.years;

  /** 指標在軌道上的哪一年。超出兩端就夾回兩端，拖出框外不會選空。 */
  const yearAt = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return years[0].year;
    const box = track.getBoundingClientRect();
    const ratio = (clientX - box.left) / box.width;
    const index = Math.floor(ratio * years.length);
    return years[Math.min(years.length - 1, Math.max(0, index))].year;
  };

  const commit = (range: YearRange) => {
    setAnchor(null);
    setPreview(null);
    router.push(gameBrowseHref(basePath, state, { years: range }));
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div
        ref={trackRef}
        className="flex touch-pan-y items-end gap-[3px] select-none"
        style={{ height: BAR_MAX_PX }}
        onPointerDown={(event) => {
          // 只接主鍵與觸控；右鍵與中鍵留給瀏覽器（在新分頁開啟那一年）。
          if (event.button !== 0) return;
          const year = yearAt(event.clientX);
          setAnchor(year);
          setPreview({ from: year, to: year });
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (anchor === null) return;
          const year = yearAt(event.clientX);
          setPreview({
            from: Math.min(anchor, year),
            to: Math.max(anchor, year),
          });
        }}
        onPointerUp={(event) => {
          if (anchor === null) return;
          const year = yearAt(event.clientX);
          // 沒有移動過＝這是一次點擊，交給兩次點擊定起訖那套；有移動過就是
          // 框選，直接用掃過的那一段。
          commit(
            year === anchor
              ? yearRangeAfterClick(state.years, year)
              : { from: Math.min(anchor, year), to: Math.max(anchor, year) }
          );
        }}
        onPointerCancel={() => {
          setAnchor(null);
          setPreview(null);
        }}
      >
        {years.map((entry) => {
          const inRange =
            shown !== null && entry.year >= shown.from && entry.year <= shown.to;
          return (
            <Link
              key={entry.year}
              href={gameBrowseHref(basePath, state, {
                years: yearRangeAfterClick(state.years, entry.year),
              })}
              // 拖曳已經在 pointerup 導航過了，這裡再讓連結跑一次會變成兩次。
              // 但 href 要留著：沒有 JS 的時候它就是這個控制項的全部。
              onClick={(event) => event.preventDefault()}
              // 26 根長條同時在畫面上，預設的 prefetch 會在載入時把 26 個年份
              // 各打一次 RSC，而每一個背後是三支聚合查詢加一次 findMany。
              // 量過：一次 /games 載入送出四十幾個預抓請求。篩選器不是「等一下
              // 大概會點進去」的連結，省下的那點延遲換不到這個代價。
              prefetch={false}
              draggable={false}
              // 可點的高度是整欄而不只是那根柱子——1988 年那格只有 10px 高。
              className="group flex h-full flex-1 items-end"
              aria-label={`${entry.year} 年，${entry.games} 款`}
              aria-current={inRange ? "true" : undefined}
              title={`${entry.year}：${entry.games} 款`}
            >
              <span
                className={cn(
                  "w-full rounded-t-sm transition-colors",
                  entry.games === 0
                    ? "bg-muted"
                    : inRange
                      ? "bg-primary"
                      : "bg-muted-foreground/20 group-hover:bg-muted-foreground/40"
                )}
                style={{ height: barHeight(entry.games, most) }}
              />
            </Link>
          );
        })}
      </div>

      <div className="flex gap-[3px] border-t pt-1.5">
        {years.map((entry) => (
          <span
            key={entry.year}
            className={cn(
              "min-w-0 flex-1 text-center text-[10px] tabular-nums",
              shown && entry.year >= shown.from && entry.year <= shown.to
                ? "font-semibold text-foreground"
                : "text-muted-foreground"
            )}
          >
            {tickLabel(entry.year, years)}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * 一根長條多高。
 *
 * 沒有資料的那一年畫成 1px 的線而不是 0——那個缺口（站上是 2007 與 2009）正是
 * 這張圖說得出來的事，畫成 0 會讓兩邊的年份看起來相鄰。有資料但很少的至少 2px，
 * 否則 2013 那 29 款會跟「沒有」長得一樣。
 */
function barHeight(games: number, most: number): number {
  if (games === 0) return 1;
  return Math.max(2, Math.round((games / most) * BAR_MAX_PX));
}

/**
 * 哪幾年印得出刻度。
 *
 * 逐年印會擠成一團（26 個年份、每欄約 30px），所以只印兩端與逢五逢十的年份。
 * 選取的區間另外由粗體標出來，不靠刻度。
 *
 * 沒有標籤的格子回 `null`、畫面上什麼都不印——不必塞一個空白字元佔位，
 * 兩端一定有標籤，那一列的高度由它們撐著。
 */
function tickLabel(year: number, years: YearCount[]): string | null {
  const first = years[0].year;
  const last = years[years.length - 1].year;
  if (year === first || year === last) return String(year);
  return year % 5 === 0 ? String(year) : null;
}
