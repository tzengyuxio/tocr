/**
 * 拿 cdosgame 的條目把站上的遊戲填厚一點：開發商、發行商、類型、封面。
 *
 * 遊戲頁的版面早就準備好了（封面、原文名、發售日、開發商、發行商、平台、類型、
 * 描述都有位置），缺的只是資料——6,744 筆裡 `developer` 只有 1 筆、`coverImage`
 * 3 筆，而那 3 筆還是 RAWG 的**截圖**，不是 data-conventions 要的盒裝圖。
 *
 * **只碰雙向一對一的條目。** 站上一筆對到兩個上游條目（「天龍八部」有 1997 與
 * 2002 兩款），或一個上游條目對到站上兩筆（同一款的兩種抄法），都要人先判，
 * 自動填會把其中一邊的資料種到錯的條目上。
 *
 * **只填空的**，與合併時同一條規則：站上的值是編輯選的，上游的是參考。
 *
 * 封面存的是 cdosgame 上的網址，不轉存。兩站同屬一人，複製一份只是讓同一張圖有
 * 兩個要同步的地方；前台渲染遊戲封面帶 `unoptimized`、不走 `/_next/image`，所以
 * `remotePatterns` 也擋不到外連（RAWG 那條 2026-08-22 實測過）。
 *
 * 用法：
 *   npx tsx scripts/enrich-from-cdosgame.ts --prod --top=20             # dry run
 *   npx tsx scripts/enrich-from-cdosgame.ts --prod --top=20 --base https://tocr.simagame.me --apply
 *
 * `--top=N` 取站上文章數最多的 N 筆（那是「代表性」最直接的量法），
 * `--developer=KOEI` 限定某家開發商——光榮那批單看文章數擠不進前段，
 * 但一個雜誌索引站沒有《信長之野望》與《三國志》說不過去。
 */
import { execFileSync } from "node:child_process";
import { productionToken } from "./prod-token";
import { nameKey } from "../src/lib/name-match";
import { enrichment, pickCover, type CdosEntry } from "../src/lib/cdosgame";

const CDOSGAME = "https://cdosgame.simagame.me";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const top = Number(args.find((a) => a.startsWith("--top="))?.slice(6) ?? 20);
const developer = args.find((a) => a.startsWith("--developer="))?.slice(12);
const baseIndex = args.indexOf("--base");
const base = baseIndex === -1 ? "http://localhost:3000" : args[baseIndex + 1];

interface CdosGame extends CdosEntry {
  title_zh: string;
  title_aliases?: string[];
  year?: number;
}

async function main() {
  if (args.includes("--prod")) {
    process.env.DATABASE_URL = execFileSync("security", [
      "find-generic-password", "-s", "tocr-prod-db-url", "-a", process.env.USER ?? "", "-w",
    ]).toString().trim();
  }
  const { prisma } = await import("../src/lib/prisma");

  const isLocal = base.startsWith("http://localhost");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!isLocal) headers.Authorization = `Bearer ${productionToken()}`;

  try {
    const [upstream, games] = await Promise.all([
      (await fetch(`${CDOSGAME}/games.json`)).json() as Promise<CdosGame[]>,
      prisma.game.findMany({
        select: {
          id: true, name: true, nameKeys: true, developer: true,
          publisher: true, genres: true, coverImage: true,
          _count: { select: { articleGames: true } },
        },
      }),
    ]);

    // 兩邊各建一次索引，才看得出哪些是雙向一對一。
    const byKey = new Map<string, CdosGame[]>();
    for (const entry of upstream) {
      for (const title of [entry.title_zh, ...(entry.title_aliases ?? [])]) {
        const key = nameKey(title);
        if (key) byKey.set(key, [...(byKey.get(key) ?? []), entry]);
      }
    }

    const matches = games.flatMap((game) => {
      const found = [...new Set(game.nameKeys.flatMap((k) => byKey.get(k) ?? []))];
      return found.length === 1 ? [{ game, entry: found[0] }] : [];
    });

    const perEntry = new Map<string, number>();
    for (const { entry } of matches) {
      perEntry.set(entry.id, (perEntry.get(entry.id) ?? 0) + 1);
    }

    const targets = matches
      .filter(({ entry }) => perEntry.get(entry.id) === 1)
      .filter(({ entry }) => !developer || entry.developer === developer)
      .sort((a, b) => b.game._count.articleGames - a.game._count.articleGames)
      .slice(0, top);

    console.log(
      `站上 ${games.length} 筆、上游 ${upstream.length} 筆，雙向一對一 ` +
        `${matches.filter(({ entry }) => perEntry.get(entry.id) === 1).length} 筆` +
        (developer ? `，其中 ${developer} 開發的取 ` : `；取文章最多的 `) +
        `${targets.length} 筆\n`
    );

    let written = 0, skipped = 0, failed = 0;

    for (const { game, entry } of targets) {
      const page = await fetch(`${CDOSGAME}/games/${entry.id}`, {
        headers: { "User-Agent": "tocr-enrich" },
      });
      const cover = page.ok ? pickCover(await page.text(), `${CDOSGAME}/games/${entry.id}`) : null;
      const patch = enrichment(game, entry, cover, game.coverImage);

      if (Object.keys(patch).length === 0) {
        skipped++;
        continue;
      }

      const summary = Object.entries(patch)
        .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join("、") : v}`)
        .join("  ");

      if (!apply) {
        console.log(`  · ${game.name}（${game._count.articleGames} 篇）${entry.id}\n      ${summary}`);
        written++;
        continue;
      }

      const put = await fetch(`${base}/api/games/${game.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(patch),
      });
      if (!put.ok) {
        console.error(`  ✗ ${game.name}：HTTP ${put.status}`);
        failed++;
        continue;
      }
      console.log(`  ✓ ${game.name}  ${summary}`);
      written++;
    }

    console.log(
      `\n${apply ? "已填" : "會填"} ${written} 筆，沒有東西要補的跳過 ${skipped} 筆` +
        (failed ? `，失敗 ${failed} 筆` : "") +
        (apply ? "" : "\n（這是 dry run，加 --apply 才真的寫）")
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
