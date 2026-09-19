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
 * `--labels` 是另一件事：**不建連結，只補既有 CDOSGAME 連結的 `label`**。遊戲頁會把
 * 站名與條目名一起列（見 src/lib/external-site.ts），但 cdosgame 的網址是流水號
 * （`/games/cdg-1564`），條目名讀不出來，只能靠 `label`。維基百科不在這個模式裡
 * ——它的條目名就在網址路徑上，寫 `label` 反而把「跟著網址走」換成一份會過期的快照。
 *
 * 標題取自本機的 cdosgame repo（`~/works/cdosgame/content/games/<id>.md` 的
 * `title_zh`），那是正本；`games.json` 只收已發布的，比本機少一千多筆。
 *
 * **原樣照抄，不清洗。** `title_zh` 裡的括號是上游拿來消歧義的
 * （`德軍總部（Castle Wolfenstein）`），而 ExternalLinkList 用「條目名與頁面標題
 * 一字不差就只顯示站名」來擋重複——剝掉括號再存會讓那幾條最該顯示的被擋掉。
 *
 * 用法：
 *   npx tsx scripts/link-cdosgame.ts --prod --top=30
 *   npx tsx scripts/link-cdosgame.ts --prod --top=30 --base https://tocr.simagame.me --apply
 *   npx tsx scripts/link-cdosgame.ts --prod --labels --base https://tocr.simagame.me --apply
 */
import { execFileSync } from "node:child_process";
import { productionToken } from "./prod-token";
import { nameKey } from "../src/lib/name-match";
import { pickWikipedia } from "../src/lib/cdosgame";
import { readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONTENT_DIR = join(homedir(), "works/cdosgame/content/games");

/** id → title_zh，讀本機 repo 的 frontmatter。抓不到目錄就回空的，呼叫端會說話。 */
function localTitles(): Map<string, string> {
  const titles = new Map<string, string>();
  for (const file of readdirSync(CONTENT_DIR)) {
    if (!file.endsWith(".md")) continue;
    // frontmatter 的前幾行就有 title_zh，整份 parse 不划算。
    const head = readFileSync(join(CONTENT_DIR, file), "utf8").slice(0, 400);
    // 值含冒號時 YAML 會加引號（`'終極警探（Operation: Clean Streets）'`），要剝掉。
    const raw = head.match(/^title_zh:\s*(.+)$/m)?.[1].trim();
    const title = raw?.replace(/^(['"])(.*)\1$/, "$2").trim();
    if (title) titles.set(file.replace(/\.md$/, ""), title);
  }
  return titles;
}

/** 只補 CDOSGAME 連結的 label——維基那批的條目名從網址讀得出來，不該蓋掉。 */
async function backfillLabels(
  prisma: typeof import("../src/lib/prisma").prisma,
  base: string,
  headers: Record<string, string>
) {
  const titles = localTitles();
  const links = await prisma.externalLink.findMany({
    where: { gameId: { not: null }, site: "CDOSGAME" },
    select: { id: true, url: true, label: true, game: { select: { name: true } } },
  });

  console.log(`本機條目 ${titles.size} 筆，站上 CDOSGAME 連結 ${links.length} 條\n`);

  let written = 0, skipped = 0, missing = 0, failed = 0;

  for (const link of links) {
    if (link.label?.trim()) { skipped++; continue; }
    const id = link.url.split("/games/")[1]?.replace(/\/$/, "");
    const title = id ? titles.get(id) : undefined;
    if (!title) { console.error(`  ? ${link.game?.name}：${link.url} 找不到標題`); missing++; continue; }

    if (!apply) { console.log(`  · ${link.game?.name} → ${title}`); written++; continue; }

    const res = await fetch(`${base}/api/links/${link.id}`, {
      method: "PATCH", headers, body: JSON.stringify({ label: title }),
    });
    if (!res.ok) { console.error(`  ✗ ${link.game?.name}：HTTP ${res.status}`); failed++; continue; }
    written++;
    if (written % 100 === 0) console.log(`  … ${written} 條`);
  }

  console.log(
    `\n${apply ? "已補" : "會補"} ${written} 條，已經有名字跳過 ${skipped} 條` +
      (missing ? `，本機查不到 ${missing} 條` : "") +
      (failed ? `，失敗 ${failed} 條` : "") +
      (apply ? "" : "\n（這是 dry run，加 --apply 才真的寫）")
  );
}

const CDOSGAME = "https://cdosgame.simagame.me";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const all = args.includes("--all");
const labels = args.includes("--labels");
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
    if (labels) {
      await backfillLabels(prisma, base, headers);
      return;
    }

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
