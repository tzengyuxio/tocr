import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-utils";
import { requireEditor } from "@/lib/require-editor";

/**
 * 拿哪個名字去問 RAWG，依序試。
 *
 * **英文名優先，中文名最後。** RAWG 是英文資料庫，`太空戰士VII` 這種譯名在
 * 那裡查無此物，而站上的 `name` 正是中文譯名——所以原本只送 `name` 的做法，
 * 對這批雜誌裡絕大多數的遊戲必定落空。
 *
 * 原文名排中間：它多半是日文，RAWG 的命中率比中文好、比英文差。中文名仍然留在
 * 最後而不是拿掉，因為華文圈自製的遊戲反而只有中文名找得到。
 *
 * 代價是前面沒中時會多打一兩次 RAWG。那是有配額的，但「多兩次請求」換掉的是
 * 「必定失敗」，划算；而且命中就馬上停，多數情況只會發出一次請求。
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
      page_size: "1",
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
    const game = data.results?.[0];
    if (!game?.background_image) continue;

    return NextResponse.json({
      coverImage: game.background_image,
      rawgName: game.name,
      matchedQuery: query,
    });
  }

  return NextResponse.json({ coverImage: null, rawgName: null });
}, "Search game cover");
