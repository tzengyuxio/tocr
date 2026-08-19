/**
 * 從 nostalibrary 的分節回填 `Magazine.categories`。
 *
 * 上游 `content/magazines/_index.md` 早就把刊物分成 PC Game／TV Game／
 * Online Game 三節，`data/magazines.json` 每筆的 `source.section` 就是那個分節。
 * 這支把它搬進 `categories`，省掉人工重標。
 *
 * **只取那三節。** 上游還有一節「近期雜誌」，那不是類別而是另一條軸——同一本
 * 會同時出現在該節與 TV Game（電視遊樂雜誌、電擊王、電玩通等七本都是），照收
 * 會得到互相矛盾的分類。
 *
 * 走 API 而不是直接連資料庫：`PUT /api/magazines/[id]` 會寫 `edit_logs`，
 * 直接下 SQL 的結果是資料對、歷史缺一塊（見 docs/data-conventions.md）。
 *
 * 冪等：值相同就跳過，重跑不會產生多餘的編輯紀錄。
 *
 * 用法：
 *   npx tsx scripts/backfill-magazine-categories.ts                    # 本機
 *   npx tsx scripts/backfill-magazine-categories.ts --base https://tocr.simagame.me
 *
 * 打正式站需要 API token，從 keychain 取（見 docs/deployment.md）：
 *   security find-generic-password -s tocr-prod-token-claude -a "$USER" -w
 */
import { readFileSync } from "node:fs";
import { productionToken } from "./prod-token";

type Category = "PC_GAME" | "TV_GAME" | "ONLINE_GAME";

const SECTION_TO_CATEGORY: Record<string, Category> = {
  "PC Game": "PC_GAME",
  "TV Game": "TV_GAME",
  "Online Game": "ONLINE_GAME",
};

/**
 * 上游的分節每本只能屬於一個，表達不了跨類別的刊物，這裡補上編輯的判斷。
 *
 * 寫進腳本而不是叫人到後台勾，是為了讓每個環境跑一次就一致——只存在某個人
 * 記憶裡的分類，換一個環境就會漏。之後有新的跨類別刊物，加在這裡即可。
 */
const MANUAL_CATEGORIES: Record<string, Category[]> = {
  // 上游列在 PC Game，但它同時報線上遊戲（yuxio 2026-08-18）
  mania: ["ONLINE_GAME"],
  // 近代刊物，上游只出現在「近期雜誌」那節、沒有分類（yuxio 2026-08-18）
  gamexpress: ["ONLINE_GAME"],
  // 上游索引把它列在 PC Game，但 data/magazines.json 這份快照
  // （nostalibrary@8a163a3f，30 筆）漏了它。等快照重新產生就可以拿掉這一行。
  ssm: ["PC_GAME"],
  // 上游只出現在「近期雜誌」那節、沒有分類；以 PC Game 為主（yuxio 2026-08-18）
  rgt: ["PC_GAME"],
  // 同樣只在「近期雜誌」那節（yuxio 2026-08-18）
  astronews: ["TV_GAME"],
  cityboy: ["TV_GAME"],
};

interface SourceMagazine {
  name: string;
  slug: string | null;
  source?: { section?: string | null } | null;
}

interface ApiMagazine {
  id: string;
  slug: string;
  name: string;
  categories?: Category[];
}

async function main() {
  const baseIndex = process.argv.indexOf("--base");
  const base = baseIndex === -1 ? "http://localhost:3000" : process.argv[baseIndex + 1];
  const isLocal = base.startsWith("http://localhost");
  // localhost runs with DEV_BYPASS_AUTH, so it needs no credential of its own.
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!isLocal) headers.Authorization = `Bearer ${productionToken()}`;

  const upstream: SourceMagazine[] = JSON.parse(
    readFileSync(new URL("../data/magazines.json", import.meta.url), "utf8")
  ).magazines;

  const res = await fetch(`${base}/api/magazines?limit=200`);
  const body = await res.json();
  const magazines: ApiMagazine[] = Array.isArray(body) ? body : body.data;

  const wanted = new Map<string, Set<Category>>();
  const add = (slug: string, category: Category) => {
    const set = wanted.get(slug) ?? new Set<Category>();
    set.add(category);
    wanted.set(slug, set);
  };
  // Some upstream rows know their section but carry no slug (星際遊樂雜誌 is
  // one), so fall back to matching on the name -- otherwise a classification
  // that upstream already made gets dropped for want of a key.
  const slugByName = new Map(magazines.map((m) => [m.name, m.slug]));
  for (const row of upstream) {
    const category = SECTION_TO_CATEGORY[row.source?.section ?? ""];
    if (!category) continue;
    const slug = row.slug ?? slugByName.get(row.name);
    if (slug) add(slug, category);
  }
  for (const [slug, categories] of Object.entries(MANUAL_CATEGORIES)) {
    for (const category of categories) add(slug, category);
  }

  let written = 0;
  const unclassified: string[] = [];

  for (const magazine of magazines) {
    // A server still running the pre-migration Prisma client omits the column
    // rather than returning []; treat that as empty so the run reports rather
    // than crashes, and restart the server if nothing writes.
    const current = magazine.categories ?? [];
    const target = wanted.get(magazine.slug);
    if (!target) {
      if (current.length === 0) unclassified.push(`${magazine.name}(${magazine.slug})`);
      continue;
    }
    // Union rather than replace: whatever an editor added in the admin form
    // survives a rerun. That also makes the run idempotent -- once every
    // wanted category is present there is nothing left to write.
    const missing = [...target].filter((c) => !current.includes(c));
    if (missing.length === 0) continue;

    const next = [...current, ...missing];
    const put = await fetch(`${base}/api/magazines/${magazine.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ categories: next }),
    });
    if (!put.ok) {
      console.error(`  ✗ ${magazine.name}: HTTP ${put.status}`);
      continue;
    }
    console.log(`  ✓ ${magazine.name} -> ${next.join(", ")}`);
    written++;
  }

  console.log(`\n${written} 本已回填，${magazines.length} 本中`);
  if (unclassified.length) {
    // Upstream has no section for these -- mostly the recent titles, which the
    // 近期雜誌 section groups by date rather than by kind. They need an editor.
    console.log(`\n上游沒有分類、要人工補的 ${unclassified.length} 本：`);
    for (const name of unclassified) console.log(`  · ${name}`);
  }
}

main();
