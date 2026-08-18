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
 *   security find-generic-password -s tocr-prod-api-token -a "$USER" -w
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

type Category = "PC_GAME" | "TV_GAME" | "ONLINE_GAME";

const SECTION_TO_CATEGORY: Record<string, Category> = {
  "PC Game": "PC_GAME",
  "TV Game": "TV_GAME",
  "Online Game": "ONLINE_GAME",
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

function productionToken(): string {
  return execFileSync("security", [
    "find-generic-password", "-s", "tocr-prod-api-token", "-a", process.env.USER ?? "", "-w",
  ]).toString().trim();
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

  const wanted = new Map<string, Category>();
  for (const row of upstream) {
    const category = SECTION_TO_CATEGORY[row.source?.section ?? ""];
    if (row.slug && category) wanted.set(row.slug, category);
  }

  const res = await fetch(`${base}/api/magazines?limit=200`);
  const body = await res.json();
  const magazines: ApiMagazine[] = Array.isArray(body) ? body : body.data;

  let written = 0;
  const unclassified: string[] = [];

  for (const magazine of magazines) {
    // A server still running the pre-migration Prisma client omits the column
    // rather than returning []; treat that as empty so the run reports rather
    // than crashes, and restart the server if nothing writes.
    const current = magazine.categories ?? [];
    const category = wanted.get(magazine.slug);
    if (!category) {
      if (current.length === 0) unclassified.push(`${magazine.name}(${magazine.slug})`);
      continue;
    }
    // Only the ones the upstream section covers are touched: a magazine an
    // editor has already given a second category keeps it.
    if (current.includes(category)) continue;

    const next = [...current, category];
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
