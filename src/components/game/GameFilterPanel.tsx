import Link from "next/link";
import { cn } from "@/lib/utils";
import { gameBrowseHref, type GameBrowseState } from "@/lib/game-browse";
import type { YearCount } from "@/lib/game-years";
import { GameYearBar } from "./GameYearBar";

/**
 * 遊戲索引的兩個篩選軸：報導年代（左）與平台（右），共用一個框。
 *
 * **年代長條不橫跨整條**。它自己就撐得起一整列，但那樣會讓它讀成這一頁的主體，
 * 而它只是個控制項；右邊切一塊給平台之後，兩個軸的份量剛好——年代是主軸所以佔
 * 七成，平台是次要的所以佔三成，而且總高度跟單獨放年代時一樣。
 *
 * 長條自己是 client component（要能拖），這一支與平台那半都不是。
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

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border md:flex-row">
      {years.length > 0 && (
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 px-5 pb-3 pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold">報導年代</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              按住掃過一段期間，或點兩下定起訖
            </span>
          </div>

          <GameYearBar basePath={basePath} state={state} years={years} />
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
