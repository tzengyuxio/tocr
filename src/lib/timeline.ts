/**
 * 年代軸：把每本刊的存續期間、重大節點與外部事件排成一張由上而下的圖。
 *
 * 這裡只做**幾何與判讀**，不碰畫面：資料庫給的是 EDTF 字串與一串單期，畫面要的
 * 是「線從哪畫到哪、哪一段該是虛線、標籤落在第幾像素」。中間這層純函式化，
 * 才測得起來——版面上一條線畫錯，肉眼是看不出它錯在哪一端的。
 *
 * 三條規則撐起整張圖：
 *
 * 1. **虛線＝不確定**，不是另一種樣式。試刊期（還沒創刊）與尾端（不知道停在
 *    哪）都是虛線，因為兩者都是「這一段的邊界站上答不出來」。實線的兩端都有
 *    出處：`foundedDate` 錨定創刊號，`endedDate` 或已知最後一期錨定另一端。
 * 2. **沒有 `endedDate` 不等於還在發行**。這批刊多半是無預警消失的，
 *    `docs/backlog/publication-dates.md` 記著 33 本缺這個值。所以尾端分三種：
 *    有 `endedDate`（收線）、`isActive`（虛線畫到今天）、其餘（虛線淡出，
 *    長度由畫面決定，不假裝知道它撐到哪一年）。
 * 3. **時間的兩端都要取**。`edtfSortDate` 給區間起點，收線要的是
 *    `edtfRangeEnd`——`endedDate` 只寫到年份的刊，畫到 1 月 1 日會憑空少一年。
 */
import { edtfRangeEnd, edtfSortDate } from "./edtf";
import { sortTitlePeriods } from "./magazine-title";
import type { MagazineCategory } from "./magazine-browse";

// ==================== 輸入 ====================

export interface TimelineIssueInput {
  id: string;
  slug: string;
  issueNumber: string;
  kind: "REGULAR" | "PILOT" | "SPECIAL";
  publishDate: string | null;
  coverImage: string | null;
  order: number;
}

export interface TimelineTitleInput {
  id: string;
  title: string;
  titleParallel: string | null;
  note: string | null;
  startIssue: {
    id: string;
    slug: string;
    issueNumber: string;
    publishDate: string | null;
    coverImage: string | null;
    order: number;
  };
}

export interface TimelineMagazineInput {
  id: string;
  name: string;
  slug: string;
  nameParallel: string | null;
  publisher: string | null;
  categories: MagazineCategory[];
  foundedDate: string | null;
  endedDate: string | null;
  isActive: boolean;
  knownIssueCount: number | null;
  /** 依 order 升冪。 */
  issues: TimelineIssueInput[];
  titles: TimelineTitleInput[];
}

// ==================== 輸出 ====================

/**
 * 節點的種類。順序即**同一天多個節點時的堆疊順序**，也決定畫面上誰蓋住誰。
 *
 * `founded` 排在 `pilot` 後面是因為創刊必定晚於試刊；`rename` 夾在中間，
 * 因為改名可以發生在任何時候，而它是這條線上唯一會出現多次的節點。
 */
export type TimelineMarkerKind = "pilot" | "founded" | "rename" | "ended";

export interface TimelineMarker {
  kind: TimelineMarkerKind;
  /** 畫面定位用。 */
  at: Date;
  /** 顯示用的原始 EDTF；精度是資料的一部分，不能在這裡補成某一天。 */
  edtf: string;
  /** 「創刊」「試刊」「改名為《遊戲世界》」「已知最後一期」。 */
  label: string;
  issueNumber: string | null;
  /** 有 slug 才連得過去；`ended` 節點取自 `endedDate` 時沒有對應的期。 */
  issueSlug: string | null;
  coverImage: string | null;
}

/** 尾端那截虛線代表什麼。null＝有 `endedDate`，線就收在那裡。 */
export type TimelineTail =
  /** 仍在發行：虛線畫到今天，長度是真的。 */
  | { kind: "active" }
  /** 只知道已知最後一期，之後不明：畫面給一截固定長度的淡出，不假裝知道多長。 */
  | { kind: "unknown" }
  | null;

export interface TimelineTrack {
  id: string;
  name: string;
  slug: string;
  nameParallel: string | null;
  publisher: string | null;
  categories: MagazineCategory[];
  /** 站上收錄的期數。 */
  issueCount: number;
  knownIssueCount: number | null;

  /** 這條線在畫面上排第幾欄，由 `packLanes` 指派。 */
  lane: number;
  /** 配色索引；同一本刊在整頁各處要拿到同一個顏色。 */
  colorIndex: number;

  /** 整條線的起點：有試刊就是最早的試刊，否則就是創刊。 */
  start: Date;
  /** 創刊。等於 `start` 時表示沒有試刊段。 */
  foundedAt: Date;
  /** 實線終點。 */
  solidEnd: Date;
  tail: TimelineTail;

  markers: TimelineMarker[];
}

// ==================== 建立 ====================

/** 每本刊至少佔這麼久，否則只出兩期的刊會縮成一個看不見的點。 */
const MIN_SPAN_DAYS = 120;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function earliest(dates: Date[]): Date | null {
  return dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
}

interface DatedIssue {
  issue: TimelineIssueInput;
  at: Date;
}

function datedIssues(issues: TimelineIssueInput[]): DatedIssue[] {
  return issues.flatMap((issue) => {
    const at = issue.publishDate ? edtfSortDate(issue.publishDate) : null;
    return at ? [{ issue, at }] : [];
  });
}

/**
 * 一本刊變成一條線。回傳 null 表示**畫不出來**——連創刊日與任何一期的日期都
 * 沒有，硬給它一個年份只會在圖上多一條假的線。頁面另外把這些刊列在圖外。
 */
export function buildTrack(
  magazine: TimelineMagazineInput,
  today: Date
): Omit<TimelineTrack, "lane" | "colorIndex"> | null {
  const dated = datedIssues(magazine.issues);

  const foundedAt =
    (magazine.foundedDate ? edtfSortDate(magazine.foundedDate) : null) ??
    earliest(dated.filter((d) => d.issue.kind === "REGULAR").map((d) => d.at)) ??
    earliest(dated.map((d) => d.at));
  if (!foundedAt) return null;

  // 試刊段只在它真的早於創刊時才成立。試刊日期偶爾錯錄成晚於創刊號，那種情況
  // 畫成倒退的虛線比不畫更難察覺。
  const pilots = dated.filter(
    (d) => d.issue.kind === "PILOT" && d.at.getTime() < foundedAt.getTime()
  );
  const firstPilot = pilots.length
    ? pilots.reduce((a, b) => (a.at <= b.at ? a : b))
    : null;

  const lastIssue = dated.length
    ? dated.reduce((a, b) => (a.at >= b.at ? a : b))
    : null;

  const endedAt = magazine.endedDate ? edtfRangeEnd(magazine.endedDate) : null;

  // 實線只畫到查得到的地方。`endedDate` 優先——它是編輯下的判斷，而已知最後
  // 一期只是收藏進度。
  let solidEnd = endedAt ?? lastIssue?.at ?? foundedAt;
  if (solidEnd.getTime() < foundedAt.getTime()) solidEnd = foundedAt;
  if (solidEnd.getTime() - foundedAt.getTime() < MIN_SPAN_DAYS * 86_400_000) {
    solidEnd = addDays(foundedAt, MIN_SPAN_DAYS);
  }

  const tail: TimelineTail = endedAt
    ? null
    : magazine.isActive
      ? { kind: "active" }
      : { kind: "unknown" };
  // 仍在發行的刊，實線畫到最後一期為止，今天之前那段是「站上還沒收到」而不是
  // 「沒出刊」——兩件事在圖上要分得出來。
  if (tail?.kind === "active" && solidEnd.getTime() > today.getTime()) {
    solidEnd = today;
  }

  const markers: TimelineMarker[] = [];

  if (firstPilot) {
    markers.push({
      kind: "pilot",
      at: firstPilot.at,
      edtf: firstPilot.issue.publishDate!,
      label: "試刊",
      issueNumber: firstPilot.issue.issueNumber,
      issueSlug: firstPilot.issue.slug,
      coverImage: firstPilot.issue.coverImage,
    });
  }

  // 創刊號的封面：order 最小的本刊。取 order 而不是日期——沒有日期的期照樣
  // 排在序列裡，而創刊號正是最容易缺日期的那一本。
  const firstRegular = magazine.issues.find((i) => i.kind === "REGULAR") ?? magazine.issues[0];
  markers.push({
    kind: "founded",
    at: foundedAt,
    edtf: magazine.foundedDate ?? firstRegular?.publishDate ?? "",
    label: "創刊",
    issueNumber: firstRegular?.issueNumber ?? null,
    issueSlug: firstRegular?.slug ?? null,
    coverImage: firstRegular?.coverImage ?? null,
  });

  // 首段不是改名——它是這條脈絡的原名。第二段起才是事件。
  for (const period of sortTitlePeriods(magazine.titles).slice(1)) {
    const at = period.startIssue.publishDate
      ? edtfSortDate(period.startIssue.publishDate)
      : null;
    if (!at) continue;
    markers.push({
      kind: "rename",
      at,
      edtf: period.startIssue.publishDate!,
      label: `改名為《${period.title}》`,
      issueNumber: period.startIssue.issueNumber,
      issueSlug: period.startIssue.slug,
      coverImage: period.startIssue.coverImage,
    });
  }

  // 尾端節點。有 `endedDate` 才敢說「停刊」，否則只能說「已知最後一期」——
  // 查到的最後一期不等於它停在那裡，見 docs/backlog/publication-dates.md。
  if (endedAt && magazine.endedDate) {
    markers.push({
      kind: "ended",
      at: endedAt,
      edtf: magazine.endedDate,
      label: "停刊",
      issueNumber: lastIssue?.issue.issueNumber ?? null,
      issueSlug: lastIssue?.issue.slug ?? null,
      coverImage: lastIssue?.issue.coverImage ?? null,
    });
  } else if (lastIssue && lastIssue.at.getTime() > foundedAt.getTime()) {
    markers.push({
      kind: "ended",
      at: lastIssue.at,
      edtf: lastIssue.issue.publishDate!,
      label: "已知最後一期",
      issueNumber: lastIssue.issue.issueNumber,
      issueSlug: lastIssue.issue.slug,
      coverImage: lastIssue.issue.coverImage,
    });
  }

  markers.sort((a, b) => a.at.getTime() - b.at.getTime());

  return {
    id: magazine.id,
    name: magazine.name,
    slug: magazine.slug,
    nameParallel: magazine.nameParallel,
    publisher: magazine.publisher,
    categories: magazine.categories,
    issueCount: magazine.issues.length,
    knownIssueCount: magazine.knownIssueCount,
    start: firstPilot?.at ?? foundedAt,
    foundedAt,
    solidEnd,
    tail,
    markers,
  };
}

// ==================== 排欄 ====================

/**
 * 把線塞進最少的欄位：時間上不重疊的刊共用一欄。
 *
 * `gapMs` 是兩條線在同一欄裡至少要隔開的時間，換算自畫面上的最小間距——沒有
 * 它，1996 年結束與 1996 年創刊的兩本刊會在同一欄裡首尾相接，看起來像同一本
 * 刊沒斷過。
 *
 * 依起點排序後逐條放進「第一個放得下的欄」，是排程問題的標準貪心解，也剛好是
 * 讀者的期待：先創刊的排左邊。
 */
export function packLanes<
  T extends { start: Date; solidEnd: Date; tail: TimelineTail; slug?: string },
>(
  tracks: T[],
  gapMs: number,
  today: Date,
  /**
   * 要排在一起的刊，一組一個陣列（見 `LANE_GROUPS`）。同一組的刊先排，時間不
   * 重疊就共用同一欄，重疊就落在**相鄰**的欄——關係要看得出來，得先讓它們挨著。
   * 只列到一本、或該側沒有的組會被略過。
   */
  groups: string[][] = []
): (T & { lane: number })[] {
  const occupiedUntil = (t: T) =>
    (t.tail?.kind === "active" ? Math.max(t.solidEnd.getTime(), today.getTime()) : t.solidEnd.getTime()) +
    gapMs;
  const byStart = (a: T, b: T) =>
    a.start.getTime() - b.start.getTime() || a.solidEnd.getTime() - b.solidEnd.getTime();

  const bySlug = new Map(tracks.flatMap((t) => (t.slug ? [[t.slug, t] as const] : [])));
  const grouped = new Set<T>();
  const units: T[][] = [];
  for (const slugs of groups) {
    const members = slugs
      .flatMap((slug) => {
        const track = bySlug.get(slug);
        return track && !grouped.has(track) ? [track] : [];
      })
      .sort(byStart);
    // 剩不到兩本的組沒有意義（該側沒有、或成員已經被前一組收走），整組放掉
    // ——**這時候才登記 grouped**，否則落單的那本會連帶被當成已排好而消失。
    if (members.length < 2) continue;
    members.forEach((m) => grouped.add(m));
    units.push(members);
  }
  units.sort((a, b) => byStart(a[0], b[0]));

  // 一組內部先自己排一次，得到組內的相對欄位；整組再當成一塊放進全域的欄位。
  const localLanes = (members: T[]) => {
    const ends: number[] = [];
    return members.map((track) => {
      // 組內用 best-fit（挑放得下的欄位裡結束最晚的那一欄），不是 first-fit：
      // 《電視遊樂雜誌》《電視遊樂報導》並存佔兩欄，晚十年的《電玩通》兩欄都
      // 放得下，而它該接的是報導那一欄——ファミ通系是同一條脈絡。first-fit 會
      // 把它塞回最左邊那欄，接到不相干的刊後面。
      let local = -1;
      let bestEnd = -Infinity;
      ends.forEach((end, i) => {
        if (end <= track.start.getTime() && end > bestEnd) {
          local = i;
          bestEnd = end;
        }
      });
      if (local === -1) local = ends.length;
      ends[local] = occupiedUntil(track);
      return { track, local };
    });
  };

  const laneEnds: number[] = [];
  const placed: (T & { lane: number })[] = [];

  for (const members of units) {
    const local = localLanes(members);
    // 整組要落在連續的幾欄裡，所以找的是「每個成員在對應那一欄都放得下」的
    // 最左邊起點，而不是各自找各自的欄。
    let base = 0;
    while (
      !local.every(
        ({ track, local: l }) => (laneEnds[base + l] ?? -Infinity) <= track.start.getTime()
      )
    ) {
      base += 1;
    }
    for (const { track, local: l } of local) {
      laneEnds[base + l] = occupiedUntil(track);
      placed.push({ ...track, lane: base + l });
    }
  }

  for (const track of tracks.filter((t) => !grouped.has(t)).sort(byStart)) {
    let lane = laneEnds.findIndex((end) => end <= track.start.getTime());
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = occupiedUntil(track);
    placed.push({ ...track, lane });
  }

  return placed;
}

// ==================== 標籤避讓 ====================

export interface StackedLabel<T> {
  item: T;
  /** 節點真正的位置。引線從這裡拉出去。 */
  anchorY: number;
  /** 標籤被推到的位置。 */
  labelY: number;
}

/**
 * 兩側的事件標註不能互相蓋住。依錨點排序後往下推，推出去的距離靠引線補回來。
 *
 * 只往下推、不往上：往兩邊推的版本會讓整叢標籤繞著空隙左右擺，讀起來比一路
 * 往下滑更亂，而且結果與輸入順序有關，不好測。
 */
export function stackLabels<T>(
  items: T[],
  anchorOf: (item: T) => number,
  /**
   * 一則標註佔多高，也就是它與下一則之間的最小距離。給函式是為了讓帶註解的
   * 標註自己撐開空間——固定值只能取最大值（整欄變疏）或最小值（長的那幾則被
   * 下一則壓住），兩種都會壞在同一批資料上。
   */
  minGap: number | ((item: T) => number)
): StackedLabel<T>[] {
  const gapOf = typeof minGap === "function" ? minGap : () => minGap;
  let cursor = -Infinity;
  return [...items]
    .sort((a, b) => anchorOf(a) - anchorOf(b))
    .map((item) => {
      const anchorY = anchorOf(item);
      const labelY = Math.max(anchorY, cursor);
      cursor = labelY + gapOf(item);
      return { item, anchorY, labelY };
    });
}

export interface PackedCallout<T> {
  item: T;
  /** 節點真正的位置。引線從這裡拉出去。 */
  anchorY: number;
  /** 排在第幾個子欄，由左而右。 */
  column: number;
  /** 圖框被放到的位置（上緣）。 */
  top: number;
}

/**
 * 把固定高度的圖框（封面）排進側欄。與 `stackLabels` 的差別是**它有好幾個子
 * 欄**：一張封面佔的高度是一行字的好幾倍，只往下推的話，1996–1999 那批擠在
 * 一起的創刊號會把後面的整批推到圖外。
 *
 * 每張封面挑**最左邊放得下的子欄**——那一欄的引線最短。全部都放不下時，挑目前
 * 最低的那一欄接在後面，等於退化成 `stackLabels` 的行為，但只發生在真的擠不下
 * 的地方。
 *
 * 與 `packLanes` 是同一種貪心，差別在這裡的單位是像素而不是時間，而且要回傳
 * 錨點——引線得知道自己從哪裡出發。
 */
export function packCallouts<T>(
  items: T[],
  anchorOf: (item: T) => number,
  { height, gap, columns }: { height: number; gap: number; columns: number }
): PackedCallout<T>[] {
  const bottoms: number[] = Array.from({ length: Math.max(1, columns) }, () => -Infinity);
  return [...items]
    .sort((a, b) => anchorOf(a) - anchorOf(b))
    .map((item) => {
      const anchorY = anchorOf(item);
      let column = bottoms.findIndex((bottom) => bottom + gap <= anchorY);
      let top = anchorY;
      if (column === -1) {
        column = bottoms.indexOf(Math.min(...bottoms));
        top = bottoms[column] + gap;
      }
      bottoms[column] = top + height;
      return { item, anchorY, column, top };
    });
}

// ==================== 座標 ====================

/** 一年在畫面上的高度。整張圖的尺度就是這個數字。 */
export const YEAR_HEIGHT = 96;

const MS_PER_YEAR = 365.2425 * 86_400_000;

export interface TimelineScale {
  /** 圖的第一年（1 月 1 日）。 */
  startYear: number;
  /** 圖的最後一年（含）。 */
  endYear: number;
  height: number;
  y: (date: Date) => number;
  years: number[];
}

export function makeScale(startYear: number, endYear: number): TimelineScale {
  const origin = Date.UTC(startYear, 0, 1);
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  return {
    startYear,
    endYear,
    height: (endYear - startYear + 1) * YEAR_HEIGHT,
    y: (date: Date) => ((date.getTime() - origin) / MS_PER_YEAR) * YEAR_HEIGHT,
    years,
  };
}

// ==================== 在架刊數 ====================

/**
 * 每年有幾本刊在發行。這是這張圖唯一的匯總——線的疏密本來就看得出趨勢，但
 * 「1998 年同時有 17 本在架」這種數字，眼睛從一堆線裡數不出來。
 *
 * 算的是**該年任何一天在架**，不是整年在架：這批刊有太多只活了幾期，用整年
 * 當門檻會把它們全數抹掉，而它們恰恰是那幾年的特徵。
 */
export function activeCountByYear(
  tracks: Pick<TimelineTrack, "start" | "solidEnd">[],
  years: number[]
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const year of years) {
    const from = Date.UTC(year, 0, 1);
    const to = Date.UTC(year + 1, 0, 1);
    counts.set(
      year,
      tracks.filter((t) => t.start.getTime() < to && t.solidEnd.getTime() >= from).length
    );
  }
  return counts;
}

// ==================== 配色 ====================

/**
 * 44 本刊各給一個色相。黃金角讓相鄰的索引拉開最大距離，所以同一欄裡前後接續
 * 的兩本刊（在全域排序裡隔得很遠）不會撞成同色。
 *
 * 明度與彩度固定：這裡的顏色只負責「這是哪一條線」，不帶第二層意思，讓它們
 * 全部落在同一個視覺重量上，深淺主題下才都還讀得到。
 */
export function trackColor(colorIndex: number): string {
  return `oklch(0.62 0.16 ${(colorIndex * 137.508) % 360}deg)`;
}
