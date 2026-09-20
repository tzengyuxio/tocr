/**
 * 把一批目錄頁掃描圖掛上單期，並順手辨識。
 *
 * 一期的目錄常常不只一頁（《遊戲設計大師》整套都是跨頁兩張），所以檔名用
 * `<title-slug>_<issue>_toc-<n>.jpg`，`<n>` 就是那一期的第幾張，排序後依序掛上。
 *
 * **已經有圖的期跳過。** 重跑是常態（OCR 會失敗、會被中斷），而 `tocImages`
 * 是整組覆蓋：不跳過就會把人工調整過的順序或補掛的圖洗掉。
 *
 * 辨識是**一期一次請求**，不是一張一次——目錄跨頁時，文章的頁碼在左頁、標題在
 * 右頁的情形很常見，分開送等於要模型憑半張圖猜。
 *
 * 用法：
 *   npx tsx scripts/upload-toc-scans.ts --dir <目錄> --magazine <slug>            # dry run
 *   npx tsx scripts/upload-toc-scans.ts --dir <目錄> --magazine <slug> --apply
 *   ... --no-ocr        只上傳不辨識
 */
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { productionToken } from "./prod-token";

const BASE = "https://tocr.simagame.me";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const required = (name: string) => {
  const value = flag(name);
  if (!value) {
    console.error(`需要 --${name}`);
    process.exit(1);
  }
  return value;
};
const dir = required("dir");
const magazineSlug = required("magazine");
const apply = args.includes("--apply");
const withOcr = !args.includes("--no-ocr");

interface Issue {
  id: string;
  issueNumber: string;
  publishDate: string | null;
  tocImages: string[];
}

const token = productionToken();
const auth = { Authorization: `Bearer ${token}` };

/**
 * 檔名裡的期號對回站上的期。
 *
 * 數字期號補零到三位，專名（創刊號、試刊號）沒有數字可補，檔名改用發行日，
 * 所以這裡兩邊都收：`007` 對 issueNumber `7`，`1998-07` 對 publishDate 開頭。
 */
function matchIssue(token: string, issues: Issue[]): Issue | undefined {
  if (/^\d+$/.test(token)) {
    return issues.find((i) => i.issueNumber === String(Number(token)));
  }
  return issues.find((i) => (i.publishDate ?? "").startsWith(token));
}

async function upload(path: string): Promise<string> {
  const body = new FormData();
  body.append("file", new Blob([readFileSync(path)], { type: "image/jpeg" }), basename(path));
  body.append("folder", "issues/toc");
  const res = await fetch(`${BASE}/api/upload`, { method: "POST", headers: auth, body });
  const json = await res.json();
  if (!res.ok) throw new Error(`上傳失敗 ${res.status}：${JSON.stringify(json)}`);
  return json.url as string;
}

async function main() {
  const magazines = await (await fetch(`${BASE}/api/magazines?limit=200`)).json();
  const rows = Array.isArray(magazines) ? magazines : magazines.data;
  const magazine = rows.find((m: { slug: string }) => m.slug === magazineSlug);
  if (!magazine) throw new Error(`找不到雜誌 ${magazineSlug}`);

  const issuesRes = await (
    await fetch(`${BASE}/api/issues?magazineId=${magazine.id}&limit=100`)
  ).json();
  const issues: Issue[] = Array.isArray(issuesRes) ? issuesRes : issuesRes.data;

  // 一期的多張圖收在一起，`_toc-1`、`_toc-2` 照數字排。
  const byIssue = new Map<string, string[]>();
  for (const file of readdirSync(dir).sort()) {
    const m = file.match(/^(.+)_([^_]+)_toc(?:-(\d+))?\.jpg$/);
    if (!m || m[1] !== magazineSlug) continue;
    byIssue.set(m[2], [...(byIssue.get(m[2]) ?? []), join(dir, file)]);
  }

  console.log(`${magazine.name}：站上 ${issues.length} 期，檔案涵蓋 ${byIssue.size} 期\n`);

  let done = 0, skipped = 0, failed = 0;
  for (const [key, files] of [...byIssue].sort()) {
    const issue = matchIssue(key, issues);
    if (!issue) {
      console.error(`  ✗ ${key}：站上找不到對應的期`);
      failed++;
      continue;
    }
    const label = `${key}（${issue.issueNumber}）`;
    if (issue.tocImages.length > 0) {
      console.log(`  · ${label} 已經有 ${issue.tocImages.length} 張圖，跳過`);
      skipped++;
      continue;
    }
    if (!apply) {
      console.log(`  · ${label} 會掛 ${files.length} 張${withOcr ? "並辨識" : ""}`);
      done++;
      continue;
    }

    try {
      const urls: string[] = [];
      for (const file of files) urls.push(await upload(file));

      const put = await fetch(`${BASE}/api/issues/${issue.id}`, {
        method: "PUT",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ tocImages: urls }),
      });
      if (!put.ok) throw new Error(`掛圖失敗 ${put.status}：${await put.text()}`);

      let note = "";
      if (withOcr) {
        const form = new FormData();
        form.append("issueId", issue.id);
        form.append("imageUrls", JSON.stringify(urls));
        const ocr = await fetch(`${BASE}/api/ocr`, { method: "POST", headers: auth, body: form });
        const json = await ocr.json();
        // 走到辨識那一步的請求一律回 200，成敗看 body（見 docs/routes.md）。
        note = json.error
          ? `，辨識失敗：${json.error}`
          : `，辨識出 ${json.result?.articles?.length ?? 0} 篇（紀錄 ${json.id}）`;
      }
      console.log(`  ✓ ${label} 掛上 ${urls.length} 張${note}`);
      done++;
    } catch (error) {
      console.error(`  ✗ ${label}：${error instanceof Error ? error.message : error}`);
      failed++;
    }
  }

  console.log(
    `\n${apply ? "已處理" : "會處理"} ${done} 期，跳過 ${skipped} 期` +
      (failed ? `，失敗 ${failed} 期` : "") +
      (apply ? "" : "\n（這是 dry run，加 --apply 才真的寫）")
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
