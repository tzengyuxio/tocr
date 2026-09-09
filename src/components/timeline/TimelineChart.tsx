import Image from "next/image";
import Link from "next/link";
import { formatEdtf } from "@/lib/edtf";
import {
  activeCountByYear,
  packCallouts,
  stackLabels,
  trackColor,
  type TimelineMarker,
  type TimelineScale,
  type TimelineTrack,
} from "@/lib/timeline";
import type { ExternalEvent, MagazineEvent, MagazineLink } from "@/lib/timeline-events";

/**
 * 年代軸的版面。
 *
 * 五欄，由左而右：**外部事件 → 年份刻度 → 雜誌的線 → 封面 → 雜誌自身的事件**。
 * 左右分工不是為了對稱——外部事件（主機上市、法規、時代座標）對每一本刊都
 * 一樣，把它們留在同一側，讀者掃某一年時看的永遠是同一個地方；屬於某一條線的
 * 東西（封面、改名、授權與刊期變更）則全部擺在線的右側，引線也短。
 *
 * 整張圖是靜態的：位置全在伺服器上算完，畫面只有 CSS hover。四十年跨度的圖
 * 本來就要靠捲動讀，把它做成可縮放的互動圖，換來的是每個讀者都得先學會操作它。
 */

// 整張圖的寬度＝ LEFT ＋ AXIS ＋ 線 ＋ 封面欄 ＋ RIGHT。2026-09-08 量到 1688px
// （20 條線），比多數筆電的可視寬度還寬，所以兩側各收 60px、線距收 8px，
// 換到約 1408px。再要瘦下去就得動到「一本刊一條線」這個前提了。
const LEFT_WIDTH = 240;
const AXIS_WIDTH = 96;
const LANE_WIDTH = 32;
const RIGHT_WIDTH = 240;

const LINE_WIDTH = 4;

/** 月刻度的長度（季刻度長一級），與它們共同的右緣。 */
const TICK_SHORT = 7;
const TICK_LONG = 14;
const TICK_RIGHT = LEFT_WIDTH + AXIS_WIDTH;
/**
 * 外部事件的引線停在刻度**左端之外**的這個位置。留白讓刻度自己還看得出是一條
 * 獨立的刻度——引線一路碰上去的話，兩者會連成一整條橫線，讀者反而看不出它指的
 * 是哪一格。以季刻度（較長的那種）的左端為準，月刻度前面因此空得多一點。
 */
const LEADER_END = TICK_RIGHT - TICK_LONG - 6;

/**
 * 封面欄：封面不壓在線上，拉一條引線放到線的右側。
 *
 * 壓在線上的版本每張只有 30px 才不遮住線，卻仍然蓋掉直排刊名的前幾個字；擺進
 * 專屬的一欄之後圖可以放大，線也乾淨。**分成幾個子欄**是因為創刊號集中在
 * 1996–1999，單欄排不下（見 `packCallouts`）。
 */
const COVER_WIDTH = 38;
/** 掃描比例不一，取 3:4 這個常見值當估計。 */
const COVER_HEIGHT = 51;
const COVER_COLUMNS = 4;
const COVER_GAP = 6;
const COVER_COL_WIDTH = COVER_WIDTH + COVER_GAP;
const COVER_ZONE_WIDTH = COVER_COLUMNS * COVER_COL_WIDTH + 16;

/** 不知道有沒有停刊的那截尾巴。固定長度——它表達的是「不知道」，不是一段時間。 */
const UNKNOWN_TAIL = 34;

/**
 * 一則側欄標註佔多高。**估出來的，不是量出來的**——版面在伺服器上算完，這裡沒有
 * 瀏覽器可以問，所以按字數推行數：標題 11px、註解 10px，欄寬扣掉內距約放得下
 * 19 與 21 個中文字。估得寬一點沒關係（欄位空一點），估窄了才會疊在一起。
 */
function labelHeight(head: string, note?: string): number {
  // 半形字（日期、拉丁刊名）大約只佔中文字的一半寬，一起數的話光是行首的日期
  // 就會多算出一行，整欄跟著往下漂。
  const cjkWidth = (text: string) =>
    [...text].reduce((w, ch) => w + (/[\x00-\xFF]/.test(ch) ? 0.55 : 1), 0);
  const lines = (text: string, perLine: number) => Math.max(1, Math.ceil(cjkWidth(text) / perLine));
  return 15 * lines(head, 19) + 12 * (note ? lines(note, 21) : 0) + 6;
}

const CATEGORY_TINT: Record<string, string> = {
  PC_GAME: "PC",
  TV_GAME: "TV",
  ONLINE_GAME: "OLG",
};

export interface TimelineChartProps {
  tracks: TimelineTrack[];
  scale: TimelineScale;
  externalEvents: ExternalEvent[];
  magazineEvents: MagazineEvent[];
  /** 刊與刊之間的關係線（分家之類）。 */
  links: MagazineLink[];
  today: Date;
}

/**
 * 右欄的一則標註。兩個來源合成一份清單再一起避讓——分開排的話，同一年的改名與
 * 授權變動會各自算各自的間距，最後疊在一起。
 */
interface RightItem {
  key: string;
  /**
   * 這行字前面掛的刊名。改名的用**改名前**那一段的名字，其餘用 `Magazine.name`
   * ——不然《電視遊樂報導》那條會讀成「電視遊樂報導 改名為《電視遊樂報導》」。
   */
  name: string;
  /** 改名的節點是 `buildTrack` 從 MagazineTitle 長出來的，線上已經有一道橫槓；
   *  事件沒有節點，要另外在線上補一個記號，否則引線看起來接在空氣上。 */
  kind: "rename" | "event";
  track: TimelineTrack;
  date: Date;
  /** 顯示用的日期字串，精度照資料。 */
  at: string;
  title: string;
  note?: string;
}

export function TimelineChart({
  tracks,
  scale,
  externalEvents,
  magazineEvents,
  links,
  today,
}: TimelineChartProps) {
  const laneCount = tracks.reduce((n, t) => Math.max(n, t.lane + 1), 1);
  const lanesWidth = laneCount * LANE_WIDTH;
  const width = LEFT_WIDTH + AXIS_WIDTH + lanesWidth + COVER_ZONE_WIDTH + RIGHT_WIDTH;
  // 上下各留一點：第一年的刻度線與最後一截尾巴都不該貼著容器的邊。
  const PAD_TOP = 24;
  const PAD_BOTTOM = 64;
  const height = scale.height + PAD_TOP + PAD_BOTTOM;

  const lanesLeft = LEFT_WIDTH + AXIS_WIDTH;
  const laneCenter = (lane: number) => lanesLeft + lane * LANE_WIDTH + LANE_WIDTH / 2;
  const y = (date: Date) => scale.y(date) + PAD_TOP;

  const counts = activeCountByYear(tracks, scale.years);
  const peak = Math.max(1, ...counts.values());

  const byId = new Map(tracks.map((t) => [t.slug, t]));

  // 圖只畫得下有刊物的那幾十年；範圍外的事件不畫，否則會被壓在頂端或底端疊成一堆。
  const inRange = (date: Date) => {
    const year = date.getUTCFullYear();
    return year >= scale.startYear && year <= scale.endYear;
  };

  const leftLabels = stackLabels(
    externalEvents.filter((e) => inRange(e.date)),
    (e) => y(e.date),
    (e) => labelHeight(`${e.at}　${e.title}`, e.note)
  );
  // 右欄＝改名（來自 MagazineTitle，資料庫算得出來）＋ 授權與刊期的變動
  // （手寫在 timeline-events）。改名在線上只是一道橫槓，橫槓說不出改成什麼，
  // 所以每一次改名都在右欄留一行字。
  const renameItems: RightItem[] = tracks.flatMap((track) =>
    track.markers
      .filter((m) => m.kind === "rename" && inRange(m.at))
      .map((m) => ({
        key: `${track.slug}-rename-${m.at.toISOString()}`,
        kind: "rename" as const,
        name: m.titleBefore ?? track.name,
        track,
        date: m.at,
        // 照錄 EDTF，不走 formatEdtf——右欄同時排著改名與事件，事件那半的日期
        // 直接來自 timeline-events 的 EDTF 字串，兩種寫法混在同一欄裡（「1998 年
        // 2 月」與「2004-10」）只會讓人以為它們是兩種不同的東西。
        at: m.edtf,
        title: m.label,
        note: m.issueNumber ? `自 ${m.issueNumber} 起` : undefined,
      }))
  );
  const eventItems: RightItem[] = magazineEvents
    .filter((e) => byId.has(e.magazineSlug) && inRange(e.date))
    .map((e) => ({
      key: `${e.magazineSlug}-${e.at}-${e.title}`,
      kind: "event" as const,
      name: byId.get(e.magazineSlug)!.name,
      track: byId.get(e.magazineSlug)!,
      date: e.date,
      at: e.at,
      title: e.title,
      note: e.note,
    }));
  const rightLabels = stackLabels(
    [...renameItems, ...eventItems],
    (item) => y(item.date),
    (item) => labelHeight(`${item.at}　${item.name}　${item.title}`, item.note)
  );

  // 封面：每條線的頭（試刊或創刊）與尾各一張。改名節點不放——那件事右欄有一整
  // 行字說明，再擺一張圖只是重複。
  const coverZoneLeft = lanesLeft + lanesWidth;
  const covers = packCallouts(
    tracks.flatMap((track) => {
      const head = headMarker(track);
      const tail = track.markers.find((m) => m.kind === "ended");
      return [head, tail === head ? undefined : tail]
        .filter((m): m is TimelineMarker => !!m?.coverImage)
        .map((marker) => ({ track, marker }));
    }),
    ({ marker }) => y(marker.at) - COVER_HEIGHT / 2,
    { height: COVER_HEIGHT, gap: COVER_GAP, columns: COVER_COLUMNS }
  );

  return (
    <div className="overflow-x-auto pb-4">
      <div className="relative mx-auto" style={{ width, height }}>
        {/* 年線。橫跨整張圖，因為左右兩欄的標註要對得回年份上。 */}
        {scale.years.map((year) => (
          <div
            key={year}
            className="absolute border-t border-border/50"
            style={{ top: y(new Date(Date.UTC(year, 0, 1))), left: 0, width }}
          />
        ))}

        {/* 季與月的刻度。只畫在年份欄那一段，不橫跨整張圖——月線每 8px 一條，
            拉滿寬度就成了一片網格，線與封面反而讀不出來。長的是季（1、4、7、10
            月），短的是其餘的月份。 */}
        {scale.years.flatMap((year) =>
          Array.from({ length: 11 }, (_, i) => i + 1).map((month) => {
            const isQuarter = month % 3 === 0;
            const tickWidth = isQuarter ? TICK_LONG : TICK_SHORT;
            return (
              <div
                key={`${year}-${month}`}
                className={
                  isQuarter ? "absolute border-t border-border/70" : "absolute border-t border-border/40"
                }
                style={{
                  top: y(new Date(Date.UTC(year, month, 1))),
                  left: TICK_RIGHT - tickWidth,
                  width: tickWidth,
                }}
              />
            );
          })
        )}

        {/* 外部事件的引線先畫，年份與在架刊數後畫——引線橫越年份欄，蓋在數字上
            會讓那一年讀不出來。 */}
        {leftLabels.map(({ item, anchorY, labelY }) => (
          <ExternalEventLeader
            key={`${item.at}-${item.title}`}
            anchorY={anchorY}
            labelY={labelY}
          />
        ))}

        {/* 十年線畫深一點：四十年的圖需要一個粗一級的刻度才數得快。 */}
        {scale.years
          .filter((year) => year % 10 === 0)
          .map((year) => (
            <div
              key={year}
              className="absolute border-t border-border"
              style={{ top: y(new Date(Date.UTC(year, 0, 1))), left: 0, width }}
            />
          ))}

        {/* ── 年份刻度與在架刊數 ── */}
        {scale.years.map((year) => {
          const count = counts.get(year) ?? 0;
          return (
            <div
              key={year}
              className="absolute flex items-start gap-1.5"
              style={{
                top: y(new Date(Date.UTC(year, 0, 1))) + 3,
                left: LEFT_WIDTH,
                width: AXIS_WIDTH,
              }}
            >
              <span
                className={
                  year % 5 === 0
                    ? "w-10 shrink-0 text-right text-xs font-medium tabular-nums"
                    : "w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground"
                }
              >
                {year}
              </span>
              {/* 在架刊數。橫條而不是數字：讀者要的是形狀，一年一個數字反而看不出
                  1998 那個高峰。形狀看得出高峰，但看不出高峰是幾本——滑上去才給
                  數字，跟封面的說明同一套做法（`z-50` 的小標籤，不是 `title`）。
                  外面那層 `py-1 -my-1` 只是把 1.5px 高的橫條變得指得到。 */}
              <span className="group relative -my-1 mt-0.5 flex items-center py-1">
                <span
                  className="h-1.5 rounded-sm bg-primary/25 transition-colors group-hover:bg-primary/70"
                  style={{ width: Math.max(1, (count / peak) * 36) }}
                />
                <span
                  className="pointer-events-none absolute left-full z-50 ml-1.5 rounded-sm border border-border bg-background/95 px-1.5 py-0.5 text-[10px] leading-tight whitespace-nowrap opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                  aria-hidden
                >
                  {year} 年在架 {count} 本
                </span>
              </span>
            </div>
          );
        })}

        {/* ── 左欄：外部事件 ── */}
        {leftLabels.map(({ item, labelY }) => (
          <ExternalEventLabel
            key={`${item.at}-${item.title}`}
            event={item}
            labelY={labelY}
            axisLeft={LEFT_WIDTH}
          />
        ))}

        {/* ── 雜誌的線 ── */}
        {tracks.map((track) => (
          <Track key={track.id} track={track} y={y} x={laneCenter(track.lane)} today={today} />
        ))}

        {/* ── 封面欄 ── */}
        {covers.map(({ item: { track, marker }, anchorY, column, top }) => (
          <CoverCallout
            key={`${track.id}-${marker.kind}-${marker.at.toISOString()}`}
            track={track}
            marker={marker}
            anchorX={laneCenter(track.lane)}
            anchorY={anchorY + COVER_HEIGHT / 2}
            coverZoneLeft={coverZoneLeft}
            left={coverZoneLeft + 8 + column * COVER_COL_WIDTH}
            top={top}
          />
        ))}

        {/* ── 刊與刊之間的關係線 ── */}
        {links.flatMap((link) => {
          const from = byId.get(link.from);
          const to = byId.get(link.to);
          // 兩本剛好排在同一欄時不畫：線會縮成零寬，而「它們是一夥的」在那個
          // 版面上本來就看得出來，右欄也有一行字說明。
          return from && to && from.lane !== to.lane
            ? [
                <MagazineLinkLine
                  key={`${link.from}-${link.to}`}
                  link={link}
                  fromX={laneCenter(from.lane)}
                  toX={laneCenter(to.lane)}
                  top={y(to.start)}
                  color={trackColor(from.colorIndex)}
                />,
              ]
            : [];
        })}

        {/* 事件在線上的記號。改名不畫——它自己就是一個節點（見 Track）。 */}
        {rightLabels
          .filter(({ item }) => item.kind === "event")
          .map(({ item, anchorY }) => (
            <div
              key={`${item.key}-tick`}
              className="absolute z-10 rounded-full ring-1 ring-background"
              style={{
                left: laneCenter(item.track.lane) - 5,
                top: anchorY - 1,
                width: 10,
                height: 2,
                backgroundColor: trackColor(item.track.colorIndex),
                opacity: 0.85,
              }}
              title={`${item.name}　${item.at}　${item.title}`}
            />
          ))}

        {/* ── 右欄：改名與雜誌自身的事件 ── */}
        {rightLabels.map(({ item, anchorY, labelY }) => (
          <MagazineEventLabel
            key={item.key}
            item={item}
            anchorY={anchorY}
            labelY={labelY}
            anchorX={laneCenter(item.track.lane)}
            columnLeft={coverZoneLeft + COVER_ZONE_WIDTH}
          />
        ))}
      </div>
    </div>
  );
}

/** 一本刊的線：試刊虛線、正刊實線、尾端虛線，加上節點與封面。 */
function Track({
  track,
  y,
  x,
  today,
}: {
  track: TimelineTrack;
  y: (d: Date) => number;
  x: number;
  today: Date;
}) {
  const color = trackColor(track.colorIndex);
  const topY = y(track.start);
  const foundedY = y(track.foundedAt);
  const solidEndY = y(track.solidEnd);
  const tailEndY =
    track.tail?.kind === "active"
      ? Math.max(solidEndY, y(today))
      : track.tail?.kind === "unknown"
        ? solidEndY + UNKNOWN_TAIL
        : solidEndY;

  const span = [
    track.name,
    track.publisher ?? "",
    `${formatEdtf(track.markers.find((m) => m.kind === "founded")?.edtf) || "?"} 起`,
    `站上 ${track.issueCount} 期`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      {/* 試刊段：正式創刊前的那截，虛線，因為它還不在出版社自己的期數裡。 */}
      {foundedY > topY && (
        <div
          className="absolute rounded-full opacity-70"
          style={{
            left: x - LINE_WIDTH / 2,
            top: topY,
            width: LINE_WIDTH,
            height: foundedY - topY,
            backgroundImage: `repeating-linear-gradient(to bottom, ${color} 0 4px, transparent 4px 8px)`,
          }}
        />
      )}

      {/* 正刊段。 */}
      <div
        className="absolute rounded-full"
        style={{
          left: x - LINE_WIDTH / 2,
          top: foundedY,
          width: LINE_WIDTH,
          height: Math.max(2, solidEndY - foundedY),
          backgroundColor: color,
        }}
        title={span}
      />

      {/* 尾端：不知道停在哪，或還在出。兩種都是虛線，差別只在長度是不是真的。 */}
      {track.tail && tailEndY > solidEndY && (
        <div
          className="absolute rounded-full opacity-55"
          style={{
            left: x - LINE_WIDTH / 2,
            top: solidEndY,
            width: LINE_WIDTH,
            height: tailEndY - solidEndY,
            backgroundImage: `repeating-linear-gradient(to bottom, ${color} 0 3px, transparent 3px 7px)`,
            // 只有「不知道停在哪」的那一截要淡出——它沒有終點。仍在發行的刊，
            // 尾巴一路到今天是真的有那麼長，淡出會把它讀成快要結束。
            ...(track.tail.kind === "unknown"
              ? {
                  WebkitMaskImage: "linear-gradient(to bottom, black 30%, transparent)",
                  maskImage: "linear-gradient(to bottom, black 30%, transparent)",
                }
              : {}),
          }}
          title={
            track.tail.kind === "active"
              ? `${track.name}：仍在發行`
              : `${track.name}：之後是否停刊不詳`
          }
        />
      )}

      {/* 刊名，沿著線往下寫。線短的刊會被裁掉，全名留在 title 與頁尾的索引裡。
          `nowrap` 是必要的：直排文字換行是往左長出第二欄，而 `overflow: hidden`
          在 vertical-rl 下留下的是最後一欄——不加就會只看到刊名的末字。 */}
      <Link
        href={`/magazines/${track.slug}`}
        className="absolute overflow-hidden text-[11px] leading-none font-medium whitespace-nowrap text-foreground/80 hover:text-foreground"
        style={{
          left: x + LINE_WIDTH / 2 + 3,
          top: foundedY + 2,
          maxHeight: Math.max(28, tailEndY - foundedY + 14),
          writingMode: "vertical-rl",
        }}
        title={span}
      >
        {track.name}
      </Link>

      {/* 節點。 */}
      {track.markers.map((marker) => (
        <Marker
          key={`${marker.kind}-${marker.at.toISOString()}`}
          marker={marker}
          track={track}
          color={color}
          x={x}
          top={y(marker.at)}
        />
      ))}
    </>
  );
}

/** 節點的說明文字，封面與圓點共用一份。 */
function markerCaption(track: TimelineTrack, marker: TimelineMarker): string {
  return `${marker.titleBefore ?? track.name}　${marker.label}${
    marker.issueNumber ? `（${marker.issueNumber}）` : ""
  }　${formatEdtf(marker.edtf)}`;
}

function markerHref(track: TimelineTrack, marker: TimelineMarker): string {
  return marker.issueSlug
    ? `/magazines/${track.slug}/issues/${marker.issueSlug}`
    : `/magazines/${track.slug}`;
}

/** 一條線的頭：有試刊就是試刊，否則是創刊。 */
function headMarker(track: TimelineTrack): TimelineMarker | undefined {
  return (
    track.markers.find((m) => m.kind === "pilot") ??
    track.markers.find((m) => m.kind === "founded")
  );
}

function Marker({
  marker,
  track,
  color,
  x,
  top,
}: {
  marker: TimelineMarker;
  track: TimelineTrack;
  color: string;
  x: number;
  top: number;
}) {
  const caption = markerCaption(track, marker);
  const href = markerHref(track, marker);

  // 改名節點畫成橫槓而不是圓點：它切開的是同一條線的兩段，橫槓看起來就像一道
  // 接縫，圓點會被讀成「這裡有一期」。
  const isRename = marker.kind === "rename";
  return (
    <Link
      href={href}
      title={caption}
      className="absolute z-10 block rounded-full ring-1 ring-background"
      style={{
        left: x - (isRename ? 6 : 3.5),
        top: top - (isRename ? 1.5 : 3.5),
        width: isRename ? 12 : 7,
        height: isRename ? 3 : 7,
        backgroundColor: color,
      }}
    />
  );
}

/**
 * 一張封面：擺在線右側的封面欄裡，用該刊顏色的引線接回節點。
 *
 * 引線走「先橫後斜」而不是直接連兩點：橫的那一段貼著節點出發，讀者一眼看得出
 * 它是從哪一條線拉出來的；88 張封面的引線疊在一起時，這件事比路徑短更重要。
 */
function CoverCallout({
  track,
  marker,
  anchorX,
  anchorY,
  coverZoneLeft,
  left,
  top,
}: {
  track: TimelineTrack;
  marker: TimelineMarker;
  anchorX: number;
  anchorY: number;
  /** 封面欄的左緣。說明的小標籤不能越過它。 */
  coverZoneLeft: number;
  left: number;
  top: number;
}) {
  const color = trackColor(track.colorIndex);
  const caption = markerCaption(track, marker);
  const centerY = top + COVER_HEIGHT / 2;
  const width = left - anchorX;
  const svgTop = Math.min(anchorY, centerY);
  const svgHeight = Math.abs(centerY - anchorY) + 2;
  const fromY = anchorY - svgTop + 1;
  const toY = centerY - svgTop + 1;

  return (
    // 滑到封面時，這一組（引線、線上的節點、封面）一起亮起來。分不出一張封面
    // 屬於哪一條線是這張圖最容易迷路的地方——引線細、又有八十幾條交錯。三者包
    // 在同一個 group 裡就只靠 CSS 做得到，不必把整張圖變成 client component。
    <div className="group">
      <svg
        className="pointer-events-none absolute opacity-40 transition-opacity group-hover:opacity-100"
        style={{ left: anchorX, top: svgTop - 1, width, height: svgHeight }}
        aria-hidden
      >
        <path
          d={`M 0 ${fromY} L 12 ${fromY} L ${width} ${toY}`}
          fill="none"
          stroke={color}
          className="[stroke-width:1] transition-[stroke-width] group-hover:[stroke-width:2.5]"
        />
      </svg>

      {/* 節點外面套一圈，變成雙圓圈。畫成外環而不是放大節點本身：節點放大會蓋掉
          它兩側的線，讀者反而看不出它落在哪一段上。 */}
      <div
        className="pointer-events-none absolute z-20 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          left: anchorX - 6.5,
          top: anchorY - 6.5,
          width: 13,
          height: 13,
          border: `1.5px solid ${color}`,
          boxShadow: "0 0 0 1.5px var(--background)",
        }}
        aria-hidden
      />

      {/* 節點的說明本來只在 `title` 裡，要停一秒才等得到，而且系統的 tooltip 會
          跳到游標旁邊——游標那時在封面上，離節點好幾百像素遠。改成直接浮在節點
          上方，跟外環一起出現，指的是哪一期一眼就對得起來。
          **右緣釘在封面欄的左緣**，往左長（`translateX(-100%)`）：長度不定的字往
          右長會伸進封面欄疊上那張放大的圖，貼齊節點又會退到圖的另一頭去，粗線、
          標籤、封面散成兩處。收在封面欄外緣，三者剛好排在同一段視線上。
          `z-50` 是全圖最上層——它是暫時浮起來的說明，蓋住底下什麼都無所謂。 */}
      <div
        className="pointer-events-none absolute z-50 rounded-sm border border-border bg-background/95 px-1.5 py-0.5 text-[10px] leading-tight whitespace-nowrap opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
        style={{
          left: coverZoneLeft - 4,
          top: anchorY - 22,
          transform: "translateX(-100%)",
          color,
        }}
        aria-hidden
      >
        {caption}
      </div>

      {/* 沒有 `title`：同一段字上面那塊標籤已經在講了，留著只會讓系統的 tooltip
          晚一秒再冒出來一份，還冒在幾百像素外的游標旁邊。無障礙那份在 alt 裡。 */}
      <Link
        href={markerHref(track, marker)}
        className="absolute z-10 block rounded-[2px] ring-1 ring-black/20 transition-transform hover:z-30 hover:scale-[2.2]"
        style={{ left, top, width: COVER_WIDTH, transformOrigin: "left center" }}
      >
        <Image
          src={marker.coverImage!}
          alt={caption}
          width={200}
          height={280}
          unoptimized
          className="h-auto w-full rounded-[2px] bg-muted"
        />
      </Link>
    </div>
  );
}

/**
 * 外部事件的引線：從標籤橫越年份欄，一路接到**該月的刻度**。
 *
 * 只拉到年份欄左緣的話，讀者只知道這件事「大約在這一年」；接到月刻度上，
 * 1994-06-12 與 1994-11-22 才分得出來——而分得出來正是這些事件放進圖裡的理由。
 * 畫得比年線淡，因為它是輔助線不是資料。
 */
function ExternalEventLeader({ anchorY, labelY }: { anchorY: number; labelY: number }) {
  const left = LEFT_WIDTH - 26;
  const width = LEADER_END - left;
  const top = Math.min(anchorY, labelY);
  const height = Math.abs(labelY - anchorY) + 2;
  const atAnchor = anchorY - top + 1;
  const atLabel = labelY - top + 1;

  return (
    <svg
      className="pointer-events-none absolute text-muted-foreground/40"
      style={{ left, top: top - 1, width, height }}
      aria-hidden
    >
      {/* 末端那一小段保持水平，斜線更早就轉完——指向刻度的是水平的那一段，
          斜線在最後才收尾的話，讀者會以為它指的是斜線碰到的那一格。 */}
      <path
        d={`M ${width} ${atAnchor} L ${width - 24} ${atAnchor} L 10 ${atLabel} L 0 ${atLabel}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
      />
    </svg>
  );
}

/** 左欄的一則外部事件的文字，靠右對齊貼著軸。引線是 `ExternalEventLeader`。 */
function ExternalEventLabel({
  event,
  labelY,
  axisLeft,
}: {
  event: ExternalEvent;
  labelY: number;
  axisLeft: number;
}) {
  return (
    <>
      <div
        className="absolute pr-8 text-right"
        style={{ left: 0, top: labelY - 8, width: axisLeft }}
      >
        <div className="text-[11px] leading-tight">
          <span className="mr-1.5 whitespace-nowrap tabular-nums text-muted-foreground">{event.at}</span>
          <span className={event.emphasis ? "font-semibold" : ""}>{event.title}</span>
        </div>
        {event.note && (
          <div className="text-[10px] leading-tight text-muted-foreground">{event.note}</div>
        )}
      </div>
    </>
  );
}

/**
 * 右欄的一則標註（改名或雜誌事件）：引線從線本身拉出來，用該刊的顏色，
 * 才認得出是哪一條。
 */
function MagazineEventLabel({
  item,
  anchorY,
  labelY,
  anchorX,
  columnLeft,
}: {
  item: RightItem;
  anchorY: number;
  labelY: number;
  anchorX: number;
  columnLeft: number;
}) {
  const track = item.track;
  const color = trackColor(track.colorIndex);
  const width = columnLeft + 14 - anchorX;

  return (
    <>
      <svg
        className="pointer-events-none absolute"
        style={{
          left: anchorX,
          top: Math.min(anchorY, labelY) - 1,
          width,
          height: Math.abs(labelY - anchorY) + 2,
          opacity: 0.45,
        }}
        aria-hidden
      >
        <path
          d={`M 0 ${anchorY < labelY ? 1 : Math.abs(labelY - anchorY) + 1} L ${width - 16} ${
            anchorY < labelY ? Math.abs(labelY - anchorY) + 1 : 1
          } L ${width} ${anchorY < labelY ? Math.abs(labelY - anchorY) + 1 : 1}`}
          fill="none"
          stroke={color}
          strokeWidth={1.25}
        />
      </svg>

      <div
        className="absolute pl-4"
        style={{ left: columnLeft, top: labelY - 8, width: RIGHT_WIDTH }}
      >
        <div className="text-[11px] leading-tight">
          <span className="mr-1.5 whitespace-nowrap tabular-nums text-muted-foreground">{item.at}</span>
          <Link
            href={`/magazines/${track.slug}`}
            className="font-medium hover:underline"
            style={{ color }}
          >
            {item.name}
          </Link>
          <span className="ml-1">{item.title}</span>
        </div>
        {item.note && (
          <div className="text-[10px] leading-tight text-muted-foreground">{item.note}</div>
        )}
      </div>
    </>
  );
}

/**
 * 兩條線之間的關係線：從母刊橫過去，接在新刊起點的高度上。
 *
 * 虛線且畫在線的下層——它不是出版事實的一部分，是對兩條線之間關係的註記。
 * 文字貼在線的上方，短到放得進兩欄之間；完整的說法（含出處）在右欄的事件裡。
 */
function MagazineLinkLine({
  link,
  fromX,
  toX,
  top,
  color,
}: {
  link: MagazineLink;
  fromX: number;
  toX: number;
  top: number;
  color: string;
}) {
  const left = Math.min(fromX, toX);
  const width = Math.abs(toX - fromX);
  const pointsRight = toX > fromX;

  return (
    <div className="absolute" style={{ left, top: top - 9, width }} title={link.label}>
      <div
        className="absolute h-px w-full"
        style={{
          top: 9,
          backgroundImage: `repeating-linear-gradient(to right, ${color} 0 3px, transparent 3px 6px)`,
          opacity: 0.7,
        }}
      />
      {/* 箭頭只是一個小三角，指出方向——哪一本是母刊，線本身看不出來。 */}
      <div
        className="absolute"
        style={{
          top: 5.5,
          [pointsRight ? "right" : "left"]: -1,
          borderTop: "3.5px solid transparent",
          borderBottom: "3.5px solid transparent",
          [pointsRight ? "borderLeft" : "borderRight"]: `5px solid ${color}`,
          opacity: 0.7,
        }}
      />
      <div
        className="absolute w-full text-center text-[9px] leading-none whitespace-nowrap"
        style={{ top: -2, color, opacity: 0.85 }}
      >
        {link.label}
      </div>
    </div>
  );
}

/**
 * 圖底下的刊物索引。
 *
 * 線旁邊的直排刊名會被線的長度裁掉——只出了兩期的刊，線上放不下四個字。這張
 * 表是那些刊唯一寫得全名字的地方，也是唯一按創刊順序讀得完整份書架的地方。
 */
export function TimelineIndex({ tracks }: { tracks: TimelineTrack[] }) {
  const ordered = [...tracks].sort((a, b) => a.foundedAt.getTime() - b.foundedAt.getTime());

  return (
    <ol className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
      {ordered.map((track) => {
        const founded = track.markers.find((m) => m.kind === "founded");
        const ended = track.markers.find((m) => m.kind === "ended");
        return (
          <li key={track.id} className="flex items-baseline gap-2 text-sm">
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: trackColor(track.colorIndex) }}
              aria-hidden
            />
            <Link href={`/magazines/${track.slug}`} className="font-medium hover:underline">
              {track.name}
            </Link>
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatEdtf(founded?.edtf) || "?"}
              {" – "}
              {track.tail?.kind === "active"
                ? "迄今"
                : track.tail?.kind === "unknown"
                  ? "?"
                  : formatEdtf(ended?.edtf) || "?"}
            </span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {track.categories.map((c) => CATEGORY_TINT[c]).join("·")}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
