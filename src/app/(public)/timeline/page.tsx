export const revalidate = 3600;

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  buildTrack,
  makeScale,
  packLanes,
  YEAR_HEIGHT,
  type TimelineMagazineInput,
  type TimelineTrack,
} from "@/lib/timeline";
import {
  EXTERNAL_EVENTS,
  LANE_GROUPS,
  MAGAZINE_EVENTS,
  MAGAZINE_LINKS,
} from "@/lib/timeline-events";
import { TimelineChart, TimelineIndex } from "@/components/timeline/TimelineChart";

export const metadata: Metadata = {
  title: "年代軸",
  description:
    "台灣遊戲雜誌 1986 年至今的創刊、改名與停刊，對照主機上市、作業系統改版與著作權法修正等外部事件。",
};

/**
 * 同一欄裡兩條線至少要隔開的距離，換算成時間。純粹是視覺需求：接在一起的
 * 兩條線會被讀成同一本刊沒斷過。
 */
const LANE_GAP_MS = (36 / YEAR_HEIGHT) * 365.2425 * 86_400_000;

export default async function TimelinePage() {
  const magazines = await prisma.magazine.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      nameParallel: true,
      publisher: true,
      categories: true,
      foundedDate: true,
      endedDate: true,
      isActive: true,
      knownIssueCount: true,
      issues: {
        select: {
          id: true,
          slug: true,
          issueNumber: true,
          kind: true,
          publishDate: true,
          coverImage: true,
          order: true,
        },
        orderBy: { order: "asc" },
      },
      titles: {
        select: {
          id: true,
          title: true,
          titleParallel: true,
          note: true,
          startIssue: {
            select: {
              id: true,
              slug: true,
              issueNumber: true,
              publishDate: true,
              coverImage: true,
              order: true,
            },
          },
        },
      },
    },
  });

  const today = new Date();
  const built = magazines.map((m) => ({
    magazine: m,
    track: buildTrack(m as TimelineMagazineInput, today),
  }));

  // 連創刊日與任何一期的日期都查不到的刊畫不出線。它們不該從這一頁消失——
  // 站上有它們，圖上沒有，讀者會以為漏收了——所以列在圖下方，說清楚為什麼。
  const undated = built.filter((b) => !b.track).map((b) => b.magazine);
  const drawable = built.flatMap((b) => (b.track ? [b.track] : []));

  // 電腦／線上遊戲刊排左半，家用主機刊排右半，兩群各自向中間長。混在一起排的
  // 話，同一欄裡上下相接的常常是兩種完全不同的刊，讀者沿著某一欄往下看會不斷
  // 換頻道；分邊之後，圖的左右本身就答得出「這幾年是哪一邊熱鬧」。
  //
  // **同時報導兩者的刊歸右邊**（categories 含 TV_GAME 就算），沒有分類的歸左。
  // 這是個武斷但可預測的規則——真正的雙棲刊只有幾本，讓它們每次都落在同一側，
  // 比按某種「主要類別」猜一次好。
  const isTvSide = (t: (typeof drawable)[number]) => t.categories.includes("TV_GAME");
  const leftPacked = packLanes(
    drawable.filter((t) => !isTvSide(t)),
    LANE_GAP_MS,
    today,
    LANE_GROUPS
  );
  const rightPacked = packLanes(drawable.filter(isTvSide), LANE_GAP_MS, today, LANE_GROUPS);
  const leftLanes = leftPacked.reduce((n, t) => Math.max(n, t.lane + 1), 0);
  const rightLanes = rightPacked.reduce((n, t) => Math.max(n, t.lane + 1), 0);
  // 右半從最右邊往內排，兩群才會各自靠著自己那一側。
  const packed = [
    ...leftPacked,
    ...rightPacked.map((t) => ({ ...t, lane: leftLanes + (rightLanes - 1 - t.lane) })),
  ];

  // 配色索引按創刊順序給，與排欄無關：同一欄裡前後接續的兩本刊在這個序列上
  // 隔得很遠，黃金角因此會把它們分到差很多的色相。
  const tracks: TimelineTrack[] = [...packed]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((track, index) => ({ ...track, colorIndex: index }))
    .sort((a, b) => a.lane - b.lane);

  const startYear = Math.min(...tracks.map((t) => t.start.getUTCFullYear()));
  const endYear = Math.max(
    today.getUTCFullYear(),
    ...tracks.map((t) => t.solidEnd.getUTCFullYear())
  );
  const scale = makeScale(startYear, endYear);

  const activeCount = tracks.filter((t) => t.tail?.kind === "active").length;
  const unknownCount = tracks.filter((t) => t.tail?.kind === "unknown").length;

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-6 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">年代軸</h1>
        <p className="mt-2 text-muted-foreground">
          {startYear}–{endYear} 年，站上收錄的 {tracks.length} 本雜誌各是一條線，由上而下
          走。線分兩群：電腦與線上遊戲刊靠左、家用主機刊靠右。最左邊是影響這個行業的
          外部事件，線的右側是各刊的封面與自己的改名、授權與刊期變動。
        </p>
      </header>

      <Legend activeCount={activeCount} unknownCount={unknownCount} />

      <TimelineChart
        tracks={tracks}
        scale={scale}
        externalEvents={EXTERNAL_EVENTS}
        magazineEvents={MAGAZINE_EVENTS}
        links={MAGAZINE_LINKS}
        today={today}
      />

      <section className="mt-10 border-t pt-6">
        <h2 className="mb-3 text-lg font-semibold">刊物索引</h2>
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          按創刊先後排列。圖上直排的刊名會被線的長度裁掉，只出過幾期的刊在這裡才寫得全。
        </p>
        <TimelineIndex tracks={tracks} />
      </section>

      {undated.length > 0 && (
        <section className="mt-10 border-t pt-6">
          <h2 className="mb-3 text-lg font-semibold">尚未上圖</h2>
          <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
            這幾本刊的創刊日與各期出版日都還沒查到，畫上去只會是一條猜出來的線。
            補齊之後會自動出現。
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {undated.map((m) => (
              <li key={m.id}>
                <Link href={`/magazines/${m.slug}`} className="hover:underline">
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 border-t pt-6 text-sm text-muted-foreground">
        <h2 className="mb-2 text-base font-semibold text-foreground">怎麼讀這張圖</h2>
        <ul className="max-w-3xl list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-foreground">實線</strong>是兩端都查得到出處的期間：
            上端錨定創刊號，下端錨定停刊日或已知的最後一期。
          </li>
          <li>
            <strong className="text-foreground">虛線</strong>一律表示不確定。線的上方那截
            是正式創刊前的試刊期；下方那截淡出的，是站上只知道最後一期出到哪，之後有沒有
            繼續出並不清楚——這批雜誌多半是無預警消失的，「查到的最後一期」不等於停刊。
          </li>
          <li>
            線右側的<strong className="text-foreground">封面</strong>是創刊號（或最早的
            試刊號）與最後一期，各拉一條同色的引線接回線上的節點。游標移上去會放大，
            點下去進到那一期的目錄。
          </li>
          <li>
            年份欄右緣的短刻度是<strong className="text-foreground">季與月</strong>：
            長的是每季第一個月（4、7、10 月），短的是其餘月份。
          </li>
          <li>
            年份右側的橫條是<strong className="text-foreground">當年在架的刊數</strong>，
            長度按最高的那一年等比。
          </li>
          <li>
            右欄的字是<strong className="text-foreground">改名與刊物自己的變動</strong>
            （授權、刊期、並列刊名）。改名在線上只是一道橫槓，改成什麼名字要看右欄。
            兩本刊之間的虛線箭頭是它們的關係，例如 1998 年飛訊自疾風快報分家。
          </li>
          <li>
            線的<strong className="text-foreground">左右</strong>是報導範圍：
            電腦與線上遊戲刊排在左半，家用主機刊排在右半，兩群各自向中間長。
            兩者都報導的刊歸在右半。
          </li>
        </ul>
        <p className="mt-4 max-w-3xl">
          停刊日的判定慣例與待補清單見{" "}
          <Link href="/magazines" className="underline underline-offset-2">
            雜誌列表
          </Link>
          。日期精度保留原樣：只查得到年份或季度的就寫到那裡，不補成某一天。
        </p>
      </section>
    </div>
  );
}

function Legend({
  activeCount,
  unknownCount,
}: {
  activeCount: number;
  unknownCount: number;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-4 w-1 rounded-full bg-foreground/70" />
        發行中（有出處）
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-4 w-1 rounded-full opacity-70"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, currentColor 0 3px, transparent 3px 6px)",
          }}
        />
        試刊期 / 不確定的尾端
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-1 w-3 rounded-full bg-foreground/70" />
        改名
      </span>
      <span>仍在發行 {activeCount} 本</span>
      <span>停刊時間未定 {unknownCount} 本</span>
    </div>
  );
}
