/**
 * 把站上的遊戲連到 cdosgame 的條目，順便帶上維基百科。
 *
 * 遊戲頁至今一條站外連結都沒有——`ExternalLink` 原本只掛得上雜誌與單期。三個站
 * 要互相關聯，最直接的接點就是遊戲（見 BACKLOG 的「與 nostalib / cdosgame 兩站的
 * 資料連動」）。
 *
 * **只碰雙向一對一的對照**，與 enrich-from-cdosgame.ts 同一條判準：站上一筆對到
 * 兩個上游條目（「天龍八部」有 1997 與 2002 兩款），或一個上游條目對到站上兩筆
 * （同一款的兩種抄法），都要人先判，自動連會把讀者送到錯的條目。
 *
 * 維基連結取自 cdosgame 條目頁上自己列的那條，**沒有就不建**——猜網址會連到
 * 不存在的頁面，而讀者要點進去才會發現。
 *
 * 冪等：網址已經在了就跳過，重跑不會長出第二條。
 *
 * 用法：
 *   npx tsx scripts/link-cdosgame.ts --prod --top=30
 *   npx tsx scripts/link-cdosgame.ts --prod --top=30 --base https://tocr.simagame.me --apply
 */
import { execFileSync } from "node:child_process";
import { productionToken } from "./prod-token";
import { nameKey } from "../src/lib/name-match";
import { pickWikipedia } from "../src/lib/cdosgame";

const CDOSGAME = "https://cdosgame.simagame.me";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const all = args.includes("--all");
const top = Number(args.find((a) => a.startsWith("--top="))?.slice(6) ?? 30);
const baseIndex = args.indexOf("--base");
const base = baseIndex === -1 ? "http://localhost:3000" : args[baseIndex + 1];

interface CdosGame {
  id: string;
  title_zh: string;
  title_aliases?: string[];
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
          id: true, name: true, nameKeys: true,
          externalLinks: { select: { url: true } },
          _count: { select: { articleGames: true } },
        },
      }),
    ]);

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

    const oneToOne = matches.filter(({ entry }) => perEntry.get(entry.id) === 1);
    const targets = oneToOne
      .sort((a, b) => b.game._count.articleGames - a.game._count.articleGames)
      .slice(0, all ? undefined : top);

    console.log(`雙向一對一 ${oneToOne.length} 筆，這次處理 ${targets.length} 筆\n`);

    let created = 0, skipped = 0, failed = 0;

    for (const { game, entry } of targets) {
      const existing = new Set(game.externalLinks.map((l) => l.url));
      const entryUrl = `${CDOSGAME}/games/${entry.id}`;

      const page = await fetch(entryUrl, { headers: { "User-Agent": "tocr-link" } });
      const wikipedia = page.ok ? pickWikipedia(await page.text()) : null;

      const wanted = [
        { site: "CDOSGAME", url: entryUrl },
        ...(wikipedia ? [{ site: "WIKIPEDIA", url: wikipedia }] : []),
      ].filter((link) => !existing.has(link.url));

      if (wanted.length === 0) {
        skipped++;
        continue;
      }

      if (!apply) {
        console.log(`  · ${game.name}（${game._count.articleGames} 篇）`);
        for (const link of wanted) console.log(`      ${link.site}  ${link.url}`);
        created += wanted.length;
        continue;
      }

      for (const link of wanted) {
        const res = await fetch(`${base}/api/links`, {
          method: "POST",
          headers,
          body: JSON.stringify({ gameId: game.id, ...link }),
        });
        if (!res.ok) {
          console.error(`  ✗ ${game.name} ${link.site}：HTTP ${res.status}`);
          failed++;
          continue;
        }
        console.log(`  ✓ ${game.name}  ${link.site}`);
        created++;
      }
    }

    console.log(
      `\n${apply ? "已建" : "會建"} ${created} 條連結，已經有了跳過 ${skipped} 筆遊戲` +
        (failed ? `，失敗 ${failed} 條` : "") +
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
