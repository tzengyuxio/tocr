import Link from "next/link";
import { ArrowDown, ArrowUp, LayoutGrid, List, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GAME_SORTS,
  gameBrowseHref,
  type GameBrowseState,
  type GameDirection,
} from "@/lib/game-browse";

/** What reversing does depends on the sort: a count has ends, a name list has sides. */
function reverseHint(sort: string, direction: GameDirection): string {
  if (sort === "articles") {
    return direction === "desc" ? "改為由少到多" : "改為由多到少";
  }
  return direction === "asc" ? "改為由後往前" : "改為由前往後";
}

/**
 * 篩選之後的那一列：已選條件、筆數、排序、檢視切換。
 *
 * 篩選器自己在上面的 `GameFilterPanel`，這裡只負責「選了什麼」與「怎麼看」。
 * 已選條件做成帶 ✕ 的籌碼而不是把它們留在原控制項上標示——四個軸散在兩個區塊，
 * 讀者要一眼看出「現在被什麼限制住」，得有一個地方把它們收在一起。
 *
 * 排序**不做成點表頭**：列表那張不是 `<table>`，是 flex 排的列（理由見
 * `GameList`）。沒有表頭可點，所以排序留在這裡。
 */
export function GameBrowseBar({
  basePath,
  state,
  total,
}: {
  basePath: string;
  state: GameBrowseState;
  total: number;
}) {
  const Arrow = state.direction === "asc" ? ArrowUp : ArrowDown;
  const hasFilters = state.years !== null || state.platforms.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">已選</span>

          {state.years && (
            <FilterChip
              href={gameBrowseHref(basePath, state, { years: null })}
              label={
                state.years.from === state.years.to
                  ? `${state.years.from}`
                  : `${state.years.from}–${state.years.to}`
              }
              removes="年代篩選"
            />
          )}

          {state.platforms.map((code) => (
            <FilterChip
              key={code}
              href={gameBrowseHref(basePath, state, {
                platforms: state.platforms.filter((it) => it !== code),
              })}
              label={code}
              removes={`${code} 平台篩選`}
            />
          ))}

          <Link
            href={gameBrowseHref(basePath, state, { years: null, platforms: [] })}
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            清除
          </Link>
        </div>
      )}

      <div className="flex flex-1 flex-wrap items-center justify-end gap-x-3 gap-y-2">
        <span className="text-sm text-muted-foreground">
          共 <strong className="font-semibold tabular-nums text-foreground">
            {total.toLocaleString("en-US")}
          </strong> 款
        </span>

        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">排序</span>
          {GAME_SORTS.map((option) => {
            const active = option.value === state.sort.value;
            // Clicking the sort you are already on reverses it; picking the
            // other one starts from that sort's own default.
            const nextDirection: GameDirection = active
              ? state.direction === "desc"
                ? "asc"
                : "desc"
              : option.defaultDirection;
            return (
              <Link
                key={option.value}
                href={gameBrowseHref(basePath, state, {
                  sort: option,
                  direction: nextDirection,
                })}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
                  active
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
                title={active ? reverseHint(option.value, state.direction) : undefined}
              >
                {option.label}
                {active && <Arrow className="h-3 w-3" />}
              </Link>
            );
          })}
        </div>

        <div className="flex overflow-hidden rounded-md border">
          <ViewLink
            href={gameBrowseHref(basePath, state, { view: "list" })}
            active={state.view === "list"}
            icon={<List className="h-3.5 w-3.5" />}
            label="列表"
          />
          <ViewLink
            href={gameBrowseHref(basePath, state, { view: "cards" })}
            active={state.view === "cards"}
            icon={<LayoutGrid className="h-3.5 w-3.5" />}
            label="卡片"
            className="border-l"
          />
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  href,
  label,
  removes,
}: {
  href: string;
  label: string;
  /** 唸給讀螢幕的人聽：這顆按下去會拿掉什麼。 */
  removes: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs transition-colors hover:bg-muted/60"
    >
      <span className="tabular-nums">{label}</span>
      <X className="h-3 w-3 text-muted-foreground" aria-hidden />
      <span className="sr-only">移除{removes}</span>
    </Link>
  );
}

function ViewLink({
  href,
  active,
  icon,
  label,
  className,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted",
        className
      )}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      {label}
    </Link>
  );
}
