/**
 * 把 `platforms-suggested.csv` 審過的那幾列寫進 `Game.platforms`。
 *
 * **`risk` 欄空著的才寫。** 那一欄是 `suggest-platforms.ts` 標出來的「這一列的
 * 對照本身可能錯」——靠別名對上、名稱含假名（nameKey 會把假名整段丟掉）、對到
 * 多個上游條目、同一個來源同時給了別筆。所以審核的動作就是**看過之後把 risk 欄
 * 清掉**，清掉的下一次就會被寫進去；判定不該寫的那列直接刪掉。
 *
 * 走 API 不走 SQL：`PUT /api/games/[id]` 會寫 `edit_logs`，直接下 SQL 的結果是
 * 資料對、歷史缺一塊（見 docs/data-conventions.md）。PUT 是部分更新，只送
 * `platforms` 就只動這一欄。
 *
 * **聯集而不是取代**，所以編輯在後台補的值不會被重跑洗掉，也讓這支是冪等的：
 * 該有的代號都在了就沒有東西要寫，不會多出編輯紀錄。
 *
 * 用法：
 *   npx tsx scripts/apply-platforms.ts <csv>                          # 本機，dry run
 *   npx tsx scripts/apply-platforms.ts <csv> --base https://tocr.simagame.me --apply
 *
 * 不帶 --apply 就只印出會做什麼。打正式站要 API token，從 Keychain 取。
 */
import { readFileSync } from "node:fs";
import { productionToken } from "./prod-token";
import { PLATFORM_CODES } from "../src/lib/game-platforms";

const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--base");
const apply = args.includes("--apply");
const baseIndex = args.indexOf("--base");
const base = baseIndex === -1 ? "http://localhost:3000" : args[baseIndex + 1];

interface Row {
  tocr_id: string;
  tocr_name: string;
  suggested: string;
  risk: string;
}

/** 這份 CSV 是腳本自己產的，沒有引號也沒有換行欄位——照著切就夠。 */
function readRows(path: string): Row[] {
  const [head, ...lines] = readFileSync(path, "utf8").trim().split("\n");
  const columns = head.split(",");

  return lines.map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(columns.map((c, i) => [c, cells[i] ?? ""])) as unknown as Row;
  });
}

async function main() {
  if (!csvPath) {
    console.error("用法：apply-platforms.ts <csv> [--base <url>] [--apply]");
    process.exitCode = 1;
    return;
  }

  const isLocal = base.startsWith("http://localhost");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!isLocal) headers.Authorization = `Bearer ${productionToken()}`;

  const rows = readRows(csvPath);
  const ready = rows.filter((r) => r.suggested && !r.risk);
  const codes = new Set<string>(PLATFORM_CODES);

  console.log(
    `${csvPath}：${rows.length} 列，其中 ${ready.length} 列可寫` +
      `（${rows.length - ready.length} 列還帶著 risk 或沒有建議值）\n`
  );

  let written = 0, skipped = 0, failed = 0;

  for (const row of ready) {
    const wanted = row.suggested.split("、").filter(Boolean);
    // 代號表以外的值不寫。CSV 是人手改過的，打錯字會靜靜地種進資料裡。
    const unknown = wanted.filter((c) => !codes.has(c));
    if (unknown.length > 0) {
      console.error(`  ✗ ${row.tocr_name}：不認得的代號 ${unknown.join("、")}`);
      failed++;
      continue;
    }

    const res = await fetch(`${base}/api/games/${row.tocr_id}`);
    if (!res.ok) {
      console.error(`  ✗ ${row.tocr_name}：讀取失敗 HTTP ${res.status}`);
      failed++;
      continue;
    }
    const current: string[] = (await res.json()).platforms ?? [];

    const missing = wanted.filter((c) => !current.includes(c));
    if (missing.length === 0) {
      skipped++;
      continue;
    }
    const next = [...current, ...missing];

    if (!apply) {
      console.log(`  · ${row.tocr_name}：${current.join("、") || "(空)"} → ${next.join("、")}`);
      written++;
      continue;
    }

    const put = await fetch(`${base}/api/games/${row.tocr_id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ platforms: next }),
    });
    if (!put.ok) {
      console.error(`  ✗ ${row.tocr_name}：HTTP ${put.status}`);
      failed++;
      continue;
    }
    console.log(`  ✓ ${row.tocr_name} → ${next.join("、")}`);
    written++;
  }

  console.log(
    `\n${apply ? "已寫入" : "會寫入"} ${written} 筆` +
      `，已經對了跳過 ${skipped} 筆` +
      (failed ? `，失敗 ${failed} 筆` : "") +
      (apply ? "" : "\n（這是 dry run，加 --apply 才真的寫）")
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
