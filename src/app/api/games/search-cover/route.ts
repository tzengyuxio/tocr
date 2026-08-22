import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-utils";
import { requireEditor } from "@/lib/require-editor";
import { gameNameKeys, nameKey } from "@/lib/name-match";

/** 一次拿幾筆給編輯挑。五筆放得下一列縮圖，也還沒到要捲動的長度。 */
const CANDIDATE_COUNT = 5;

export interface CoverCandidate {
  rawgName: string;
  coverImage: string;
  /** 只取年份：同名重製版靠它分辨，月日對挑封面沒有幫助。 */
  released: string | null;
  /** 名字與這款遊戲的任一個名字同鍵——標出來，但**不代表自動選它**。 */
  exact: boolean;
}

/**
 * 把 RAWG 的一頁結果整理成候選清單。
 *
 * **沒有封面的直接丟掉**：這個功能就是來拿封面的，列一筆點下去沒有圖的候選
 * 只是浪費一個位子。
 *
 * `exact` 用 `nameKey()` 判斷，與辨識、搜尋同一把尺（見 lib/name-match.ts）。
 * 它是**提示不是決定**：RAWG 的第一筆常常是同名的別款遊戲，而「名字一樣」與
 * 「是同一款」在這批老遊戲上經常不是一回事。所以標記歸標記，選哪一筆仍然是
 * 編輯按下去的。
 */
export function toCandidates(
  results: unknown,
  game: { name?: unknown; nameEn?: unknown; nameOriginal?: unknown }
): CoverCandidate[] {
  if (!Array.isArray(results)) return [];

  const keys = new Set(
    gameNameKeys({
      name: typeof game.name === "string" ? game.name : "",
      nameEn: typeof game.nameEn === "string" ? game.nameEn : null,
      nameOriginal:
        typeof game.nameOriginal === "string" ? game.nameOriginal : null,
    })
  );

  return results
    .filter(
      (row): row is { name: string; background_image: string; released?: unknown } =>
        typeof row?.name === "string" && typeof row?.background_image === "string"
    )
    .map((row) => ({
      rawgName: row.name,
      coverImage: row.background_image,
      released:
        typeof row.released === "string" ? row.released.slice(0, 4) : null,
      exact: keys.has(nameKey(row.name)),
    }));
}

/**
 * 拿哪個名字去問 RAWG，依序試。
 *
 * **英文名優先，中文名最後。** RAWG 是英文資料庫，`太空戰士VII` 這種譯名在
 * 那裡查無此物，而站上的 `name` 正是中文譯名——所以原本只送 `name` 的做法，
 * 對這批雜誌裡絕大多數的遊戲必定落空。
 *
 * 原文名排中間、中文名排最後而不是拿掉：華文圈自製的遊戲反而可能只有中文名
 * 找得到。**這兩者的先後沒有實測依據**——2026-08-22 對 RAWG 打了一輪發現它
 * 幾乎不會回空結果（14 個中文名全部都有結果，只是多半是錯的遊戲），所以後面
 * 那兩個候選實際上很少輪得到，順序也就量不出差別。等哪天真的落空了再來排。
 *
 * 也因為 RAWG 不回空結果，這條鏈解決的是「有英文名時別拿中文名去問」，**不是**
 * 「抓到錯的遊戲」——後者的成因是 route 無條件取 results[0]，見 BACKLOG。
 */
export function searchQueries(game: {
  name?: unknown;
  nameEn?: unknown;
  nameOriginal?: unknown;
}): string[] {
  const candidates = [game.nameEn, game.nameOriginal, game.name]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  // 三欄填一樣的值是常態（英文遊戲的 name 就是英文名），去重才不會把同一個
  // 查詢送兩次。
  return [...new Set(candidates)];
}

// POST /api/games/search-cover - Search RAWG for game cover image
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Spends a third-party quota, so it repeats the middleware check like the
  // other routes that cost something -- see require-editor.ts.
  const denied = await requireEditor(request);
  if (denied) return denied;

  const { name, nameEn, nameOriginal } = await request.json();

  const queries = searchQueries({ name, nameEn, nameOriginal });
  if (queries.length === 0) {
    return NextResponse.json(
      { error: "Game name is required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "RAWG API key not configured" },
      { status: 500 }
    );
  }

  for (const query of queries) {
    const params = new URLSearchParams({
      key: apiKey,
      search: query,
      page_size: String(CANDIDATE_COUNT),
    });

    const res = await fetch(`https://api.rawg.io/api/games?${params}`);

    // A failing request is reported rather than silently treated as a miss:
    // "找不到封面" and "RAWG 掛了" call for different things from the editor.
    if (!res.ok) {
      return NextResponse.json(
        { error: "RAWG API request failed" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const candidates = toCandidates(data.results, { name, nameEn, nameOriginal });
    if (candidates.length === 0) continue;

    return NextResponse.json({ candidates, matchedQuery: query });
  }

  return NextResponse.json({ candidates: [], matchedQuery: null });
}, "Search game cover");
