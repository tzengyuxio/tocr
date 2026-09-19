/**
 * 依現行的 `gameNameKeys()` 重算全庫的 `Game.nameKeys`，順便補那些沒有 slug 的。
 *
 * 2026-09-20 `slugify()` 開始保留假名與諺文之前，那兩種書寫系統被當標點剝掉：
 * 「ぷりんせすでんじゃあ」正規化後是空字串，「カスタムメイト・2」只剩 `2`。前者
 * 永遠比不中、每次辨識都新建一列；後者撞得到任何帶 2 的名字。規則改了，**既存的
 * `nameKeys` 是照舊規則算出來存下來的**，不重算就還是舊的。
 *
 * slug 那邊只補**空名字造成的 fallback**（`game`、`game-2`…`game-20`）。既有可讀的
 * slug 一律不動：遊戲沒有雜誌那套舊代號轉址表，改一個就斷一個網址。
 *
 * 走 API 不走 SQL，`edit_logs` 才有紀錄。冪等：值沒變就跳過。
 *
 * 用法：
 *   npx tsx scripts/backfill-name-keys.ts --prod
 *   npx tsx scripts/backfill-name-keys.ts --prod --base https://tocr.simagame.me --apply
 */
import { execFileSync } from "node:child_process";
import { productionToken } from "./prod-token";
import { gameNameKeys } from "../src/lib/name-match";
import { slugify } from "../src/lib/slugify";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const baseIndex = args.indexOf("--base");
const base = baseIndex === -1 ? "http://localhost:3000" : args[baseIndex + 1];

/** 名字整段被剝掉時 resolve-relations 用的 fallback，後面接流水號。 */
const FALLBACK_SLUG = /^game(-\d+)?$/;

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
    const games = await prisma.game.findMany({
      select: { id: true, name: true, slug: true, nameEn: true, nameOriginal: true,
        aliases: true, nameKeys: true },
      orderBy: { createdAt: "asc" },
    });

    const taken = new Set(games.map((g) => g.slug));
    let keysChanged = 0, slugsChanged = 0, skipped = 0, failed = 0;

    for (const game of games) {
      const patch: { nameKeys?: string[]; slug?: string } = {};

      // PUT /api/games/[id] 自己會重算 nameKeys，但那是從 before 併 patch 算的，
      // 所以送一個「名字沒變」的 patch 就會順便把鍵刷新。這裡明算是為了先比對、
      // 沒變就不送，免得 6,754 筆全部留下一條 edit log。
      const next = gameNameKeys(game);
      const changed = JSON.stringify(next) !== JSON.stringify(game.nameKeys);
      if (changed) patch.nameKeys = next;

      if (FALLBACK_SLUG.test(game.slug)) {
        const wanted = slugify(game.name);
        if (wanted && !taken.has(wanted)) {
          patch.slug = wanted;
          taken.delete(game.slug);
          taken.add(wanted);
        }
      }

      if (Object.keys(patch).length === 0) { skipped++; continue; }
      if (patch.nameKeys) keysChanged++;
      if (patch.slug) slugsChanged++;

      if (!apply) {
        console.log(`  · ${game.name}` +
          (patch.slug ? `  slug ${game.slug} → ${patch.slug}` : "") +
          (patch.nameKeys ? `  keys → ${JSON.stringify(patch.nameKeys)}` : ""));
        continue;
      }

      // nameKeys 不在 update schema 裡（它是推導出來的），所以送 name 讓伺服器
      // 自己重算；slug 則是明給。
      const body = JSON.stringify({ name: game.name, ...(patch.slug ? { slug: patch.slug } : {}) });
      const res = await fetch(`${base}/api/games/${game.id}`, { method: "PUT", headers, body });
      if (!res.ok) { console.error(`  ✗ ${game.name}：HTTP ${res.status} ${await res.text()}`); failed++; continue; }
      if ((keysChanged + slugsChanged) % 25 === 0) console.log(`  … ${keysChanged} 筆鍵、${slugsChanged} 筆 slug`);
    }

    console.log(`\n${apply ? "已改" : "會改"} nameKeys ${keysChanged} 筆、slug ${slugsChanged} 筆，` +
      `不用動的跳過 ${skipped} 筆` + (failed ? `，失敗 ${failed} 筆` : "") +
      (apply ? "" : "\n（這是 dry run，加 --apply 才真的寫）"));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
