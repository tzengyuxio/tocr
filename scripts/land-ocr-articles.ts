/**
 * 把某本刊存下來的辨識結果落地成文章。
 *
 * `/api/ocr` 只寫到 `ocr_records` 為止——辨識與落地是兩件事，中間可以隔著人。
 * `/admin/ocr` 跑完會自己接上第二步，但那是一次一期；整本刊補完目錄時需要的是
 * 「把已經辨識好的通通建起來」，這支就是那一步。
 *
 * **已經有文章的期跳過**，除非 `--replace` 點名。附加模式會把整期建成兩份，而
 * `replaceExisting` 是真的刪——連同標籤與遊戲的關聯（cascade），所以要指名道姓。
 *
 * 標籤與遊戲照 `suggestedTags` / `suggestedGames` 原樣送出，由
 * `resolve-relations.ts` 決定對得上既有的就連、對不上就新建。那裡用的是
 * `nameKey`，所以「3D 技術」與「3D技術」會收斂成同一個標籤，但辨識錯的字
 * （「鹿鼎計」之於「鹿鼎記」）不會——`--report` 把要新建的那批印出來，方便事後清。
 *
 * 用法：
 *   npx tsx scripts/land-ocr-articles.ts --magazine <slug> [--report]
 *   npx tsx scripts/land-ocr-articles.ts --magazine <slug> --apply [--replace 1,2]
 */
import { nameKey } from "../src/lib/name-match";
import { productionToken } from "./prod-token";

const BASE = "https://tocr.simagame.me";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const magazineSlug = flag("magazine");
const apply = args.includes("--apply");
const report = args.includes("--report");
const replace = new Set((flag("replace") ?? "").split(",").filter(Boolean));

if (!magazineSlug) {
  console.error("需要 --magazine");
  process.exit(1);
}

interface OcrArticle {
  title: string;
  subtitle?: string;
  authors?: string[];
  category?: string;
  pageStart?: number;
  pageEnd?: number;
  summary?: string;
  suggestedTags?: Array<{ name: string; type: string } | string>;
  suggestedGames?: string[];
}

interface Issue {
  id: string;
  issueNumber: string;
  _count: { articles: number };
}

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
}

/** 一頁一頁收完，用來建站上既有標籤與遊戲的索引。 */
async function all<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; ; page++) {
    const { data } = await get(`${path}page=${page}&limit=100`);
    out.push(...data);
    if (data.length < 100) break;
  }
  return out;
}

async function main() {
  const magazines = await get("/api/magazines?limit=200");
  const magazine = (magazines.data ?? magazines).find(
    (m: { slug: string }) => m.slug === magazineSlug
  );
  if (!magazine) throw new Error(`找不到雜誌 ${magazineSlug}`);

  const issues: Issue[] = (await get(`/api/issues?magazineId=${magazine.id}&limit=100`)).data;

  const existingTags = await all<{ type: string; nameKey: string }>("/api/tags?");
  const tagKeys = new Set(existingTags.map((t) => `${t.type}\0${t.nameKey}`));
  const existingGames = await all<{ nameKeys: string[] }>("/api/games?");
  const gameKeys = new Set(existingGames.flatMap((g) => g.nameKeys ?? []));

  const newTags = new Map<string, { name: string; type: string; count: number }>();
  const newGames = new Map<string, number>();
  let landed = 0, skipped = 0, failed = 0, articles = 0;

  for (const issue of issues) {
    const label = `第 ${issue.issueNumber} 期`;
    let ocr;
    try {
      ocr = (await get(`/api/issues/${issue.id}/ocr`)).result;
    } catch {
      console.log(`  · ${label} 沒有辨識紀錄，跳過`);
      skipped++;
      continue;
    }
    const found: OcrArticle[] = ocr.articles ?? [];
    if (found.length === 0) {
      console.log(`  · ${label} 辨識紀錄是空的（解析失敗），跳過`);
      skipped++;
      continue;
    }

    const replaceExisting = replace.has(issue.issueNumber);
    if (issue._count.articles > 0 && !replaceExisting) {
      console.log(`  · ${label} 已經有 ${issue._count.articles} 篇，跳過`);
      skipped++;
      continue;
    }

    for (const a of found) {
      for (const t of a.suggestedTags ?? []) {
        const tag = typeof t === "string" ? { name: t, type: "GENERAL" } : t;
        const k = `${tag.type}\0${nameKey(tag.name)}`;
        if (!tagKeys.has(k)) {
          newTags.set(k, { ...tag, count: (newTags.get(k)?.count ?? 0) + 1 });
        }
      }
      for (const g of a.suggestedGames ?? []) {
        if (!gameKeys.has(nameKey(g))) newGames.set(g, (newGames.get(g) ?? 0) + 1);
      }
    }

    if (!apply) {
      console.log(
        `  · ${label} 會建 ${found.length} 篇` +
          (replaceExisting ? `（取代既有的 ${issue._count.articles} 篇）` : "")
      );
      landed++;
      articles += found.length;
      continue;
    }

    // sortOrder 照辨識出來的順序，也就是目錄自己的排法（按欄目，不是按頁碼）。
    const payload = {
      issueId: issue.id,
      replaceExisting,
      articles: found.map((a, index) => ({ ...a, sortOrder: index })),
    };
    const res = await fetch(`${BASE}/api/articles/batch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${productionToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`  ✗ ${label}：HTTP ${res.status} ${await res.text()}`);
      failed++;
      continue;
    }
    const { count } = await res.json();
    console.log(`  ✓ ${label} 建了 ${count} 篇` + (replaceExisting ? "（已取代）" : ""));
    landed++;
    articles += count;
  }

  console.log(
    `\n${apply ? "已建" : "會建"} ${articles} 篇、涵蓋 ${landed} 期，跳過 ${skipped} 期` +
      (failed ? `，失敗 ${failed} 期` : "") +
      (apply ? "" : "\n（這是 dry run，加 --apply 才真的寫）")
  );

  if (report) {
    console.log(`\n要新建的標籤 ${newTags.size} 種：`);
    for (const t of [...newTags.values()].sort((a, b) => b.count - a.count)) {
      console.log(`   ${String(t.count).padStart(3)} ${t.type.padEnd(8)} ${t.name}`);
    }
    console.log(`\n要新建的遊戲 ${newGames.size} 種：`);
    for (const [g, c] of [...newGames].sort((a, b) => b[1] - a[1])) {
      console.log(`   ${String(c).padStart(3)} ${g}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
