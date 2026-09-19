import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  gameBrowseHref,
  yearRangeAfterClick,
  type GameBrowseState,
} from "@/lib/game-browse";
import type { YearCount } from "@/lib/game-years";

/** 最高的那一根有多高。低於一格的年份仍畫得出來，見 `barHeight()`。 */
const BAR_MAX_PX = 56;

/**
 * 遊戲索引的兩個篩選軸：報導年代（左）與平台（右），共用一個框。
 *
 * **年代長條不橫跨整條**。它自己就撐得起一整列，但那樣會讓它讀成這一頁的主體，
 * 而它只是個控制項；右邊切一塊給平台之後，兩個軸的份量剛好——年代是主軸所以佔
 * 七成，平台是次要的所以佔三成，而且總高度跟單獨放年代時一樣。
 *
 * **整條都是 `<Link>`，沒有任何 client state。**兩次點擊定起訖這件事全靠網址：
 * 每一根長條的 href 由「現在的區間 ＋ 這一年」算出來（`yearRangeAfterClick`），
 * 所以這一頁到現在還是整條伺服器算好的，不必為了一個篩選器把它 hydrate。
 */
export function GameFilterPanel({
  basePath,
  state,
  years,
  platforms,
  platformTotal,
}: {
  basePath: string;
  state: GameBrowseState;
  /** 每一年幾款遊戲，含中間空掉的年份。 */
  years: YearCount[];
  /** 站上真的有資料的平台，由多到少。 */
  platforms: { code: string; games: number }[];
  /** 有平台資料的遊戲數。畫面要寫出來，否則它會被讀成完整的分面。 */
  platformTotal: number;
}) {
  if (years.length === 0 && platforms.length === 0) return null;

  const most = Math.max(...years.map((y) => y.games), 1);
  const selected = state.years;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border md:flex-row">
      {years.length > 0 && (
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 px-5 pb-3 pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold">報導年代</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              選一段期間，列出那幾年的雜誌寫過的遊戲
            </span>
          </div>

          <div className="flex items-end gap-[3px]" style={{ height: BAR_MAX_PX }}>
            {years.map((entry) => {
              const inRange =
                selected !== null &&
                entry.year >= selected.from &&
                entry.year <= selected.to;
              return (
                <Link
                  key={entry.year}
                  href={gameBrowseHref(basePath, state, {
                    years: yearRangeAfterClick(selected, entry.year),
                  })}
                  // 整根長條是連結，但可點的高度是整欄而不只是那根柱子——
                  // 1988 年那格只有 10px 高，點得到才算數。
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
                  selected &&
                    entry.year >= selected.from &&
                    entry.year <= selected.to
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {tickLabel(entry.year, years) ?? " "}
              </span>
            ))}
          </div>
        </div>
      )}

      {platforms.length > 0 && (
        <div className="flex flex-col gap-2.5 border-t bg-muted/30 px-5 pb-3 pt-4 md:w-[328px] md:shrink-0 md:border-l md:border-t-0">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">平台</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {platformTotal.toLocaleString("en-US")} 款有資料
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {platforms.map((entry) => {
              const on = state.platforms.includes(entry.code);
              return (
                <Link
                  key={entry.code}
                  href={gameBrowseHref(basePath, state, {
                    platforms: on
                      ? state.platforms.filter((code) => code !== entry.code)
                      : [...state.platforms, entry.code],
                  })}
                  className={cn(
                    "flex items-baseline gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                    on
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                  aria-pressed={on}
                >
                  {entry.code}
                  <span className="tabular-nums opacity-60">{entry.games}</span>
                </Link>
              );
            })}
          </div>

          {/* 這一句不能省。平台資料是兩叢的——cdosgame 的 DOS 遊戲與《電玩通》
              2010 年代的主機——中間整段是空的，所以沒有這句話的話，讀者會把它
              讀成完整的分面，然後得出「這個站只有 1 款 PlayStation 遊戲」。 */}
          <span className="text-xs leading-relaxed text-muted-foreground">
            多數條目還沒填平台，選了會連帶篩掉它們
          </span>
        </div>
      )}
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
 */
function tickLabel(year: number, years: YearCount[]): string | null {
  const first = years[0].year;
  const last = years[years.length - 1].year;
  if (year === first || year === last) return String(year);
  return year % 5 === 0 ? String(year) : null;
}
