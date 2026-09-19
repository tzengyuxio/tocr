import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { YearRange } from "./game-browse";
import { PLATFORM_FAMILIES } from "./game-platforms";

/**
 * 「這款遊戲是哪幾年的雜誌寫的」——遊戲索引的主軸從哪裡來。
 *
 * 這裡的查詢都走 `$queryRaw`，因為要的東西 Prisma 的查詢建構器給不了：
 * **每年有幾款相異的遊戲**（`groupBy` 數不了關聯另一端的 distinct）、
 * **每款遊戲的報導年份兩端與最早的出處**（`orderBy`／`select` 都碰不到關聯的
 * min／max，也取不到「最早那一列的另一個欄位」）。全部是唯讀的聚合，沒有寫入
 * ——寫入一律走 API（見專案慣例）。
 *
 * 年份取自 `issues.publish_sort`。`publish_date` 是 EDTF 字串（`1994-22` 是
 * 「1994 年夏」），排不了序也比不了大小；`publish_sort` 才是為此存的。沒有日期
 * 的期不落進任何一年，那是對的：不知道哪一年就不該假裝知道。
 */

export interface YearCount {
  year: number;
  /** 那一年的雜誌寫過的相異遊戲數。同一款被寫很多次只算一次。 */
  games: number;
}

/**
 * 每一年有幾款遊戲被寫到，以及資料的兩端。
 *
 * **不跟著當下的篩選走**，永遠是整個站的分布。它同時是篩選器與密度圖，而密度圖
 * 要當得成地標就不能一直變形——讀者打了關鍵字之後，長條該還是那條長條，只是
 * 選取的那段換了意思。代價是「選了 PC 之後 1999 那格仍然是 764」，可以接受：
 * 那格說的是「1999 年的雜誌寫了 764 款遊戲」，本來就與平台無關。
 *
 * 中間空掉的年份也回傳（`games: 0`），否則長條會把 2006 和 2008 畫成相鄰的兩格，
 * 2007 那個缺口就消失了——而那個缺口正是這張圖說得出來的事。
 */
export async function reportingYears(): Promise<{
  counts: YearCount[];
  bounds: YearRange | null;
}> {
  const rows = await prisma.$queryRaw<{ year: number; games: bigint }[]>`
    SELECT EXTRACT(YEAR FROM i.publish_sort)::int AS year,
           COUNT(DISTINCT ag.game_id) AS games
    FROM article_games ag
    JOIN articles a ON a.id = ag.article_id
    JOIN issues i ON i.id = a.issue_id
    WHERE i.publish_sort IS NOT NULL
    GROUP BY 1
    ORDER BY 1
  `;

  if (rows.length === 0) return { counts: [], bounds: null };

  const found = new Map(rows.map((row) => [row.year, Number(row.games)]));
  const bounds = { from: rows[0].year, to: rows[rows.length - 1].year };

  const counts: YearCount[] = [];
  for (let year = bounds.from; year <= bounds.to; year++) {
    counts.push({ year, games: found.get(year) ?? 0 });
  }
  return { counts, bounds };
}

/** 一款遊戲在索引列表上要交代的事：報導年代，以及最早寫它的是哪一本。 */
export interface ReportingSummary {
  /** 年份兩端。只寫過一次的 `from === to`。 */
  years: YearRange;
  /**
   * 最早那一期屬於哪一本雜誌，取的是**該刊現在的名字**。
   *
   * 改過名的刊物因此會用新名字標一期舊的（刊名沿革在 `MagazineTitle`，這裡沒有
   * 查）。列表上這一欄要回答的是「去哪一本翻」，而讀者點過去看到的就是現在這個
   * 名字，所以先這樣；真要標當時的刊名，那是連 `MagazineTitle` 一起查的另一件事。
   */
  firstMagazine: string;
}

export type ReportingSummaries = Map<string, ReportingSummary>;

/**
 * 這一頁列出的那幾款各自的報導年代與出處。
 *
 * 只問當頁的 id，不是整張表——一次算全部要跑六千多列，而畫面一次只用得到一頁。
 * 沒有任何帶日期的期寫過的遊戲不會出現在結果裡，呼叫端當作沒有資料處理。
 *
 * 年份兩端與「最早那一本」走同一趟查詢：兩者讀的是同一組列，拆成兩支會把同樣的
 * join 跑兩次。
 */
export async function reportingSummaries(
  gameIds: string[]
): Promise<ReportingSummaries> {
  if (gameIds.length === 0) return new Map();

  const rows = await prisma.$queryRaw<
    {
      game_id: string;
      first_year: number;
      last_year: number;
      magazine: string;
    }[]
  >`
    WITH reported AS (
      SELECT ag.game_id, i.publish_sort, i.magazine_id
      FROM article_games ag
      JOIN articles a ON a.id = ag.article_id
      JOIN issues i ON i.id = a.issue_id
      WHERE i.publish_sort IS NOT NULL
        AND ag.game_id IN (${Prisma.join(gameIds)})
    ),
    span AS (
      SELECT game_id,
             MIN(EXTRACT(YEAR FROM publish_sort))::int AS first_year,
             MAX(EXTRACT(YEAR FROM publish_sort))::int AS last_year
      FROM reported
      GROUP BY game_id
    ),
    earliest AS (
      SELECT DISTINCT ON (game_id) game_id, magazine_id
      FROM reported
      ORDER BY game_id, publish_sort
    )
    SELECT s.game_id, s.first_year, s.last_year, m.name AS magazine
    FROM span s
    JOIN earliest e ON e.game_id = s.game_id
    JOIN magazines m ON m.id = e.magazine_id
  `;

  return new Map(
    rows.map((row) => [
      row.game_id,
      {
        years: { from: row.first_year, to: row.last_year },
        firstMagazine: row.magazine,
      },
    ])
  );
}

/** 「1989–1997」，只有一年時就寫那一年。 */
export function formatYearRange(range: YearRange | undefined): string | null {
  if (!range) return null;
  return range.from === range.to
    ? String(range.from)
    : `${range.from}–${range.to}`;
}

/**
 * 站上真的有資料的平台，由多到少。
 *
 * 顯示層的家族（`DOS`／`WIN`／… 併成 `PC`）在這裡就收斂完，因為按鈕上的數字要
 * 跟按下去得到的筆數一致。查不到任何一筆的代號不出現——offering 一個 0 筆的
 * 按鈕沒有意義。
 */
export async function platformCounts(): Promise<
  { code: string; games: number }[]
> {
  // 家族表只有一份（game-platforms.ts），這裡帶進去而不是把代號再抄一遍——
  // 抄一遍的話，哪天 PC 家族多一個代號，按鈕上的數字就會跟結果對不起來。
  const pcFamily = Prisma.join(PLATFORM_FAMILIES.PC);
  const rows = await prisma.$queryRaw<{ code: string; games: bigint }[]>`
    SELECT CASE WHEN p IN (${pcFamily}) THEN 'PC' ELSE p END AS code,
           COUNT(DISTINCT g.id) AS games
    FROM games g, UNNEST(g.platforms) AS p
    GROUP BY 1
    ORDER BY 2 DESC, 1
  `;
  return rows.map((row) => ({ code: row.code, games: Number(row.games) }));
}
