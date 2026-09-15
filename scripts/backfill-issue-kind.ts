/**
 * 回填 `Issue.kind`（本刊／試刊／特刊）。
 *
 * migration 給每一期的預設值是 `REGULAR`，所以這支腳本要做的只是把試刊與特刊
 * 挑出來改掉。判準見 docs/data-conventions.md 的「刊種」——看這一冊有沒有拿到
 * 正刊的編號。
 *
 * **只看 `issueNumber`，不看 `title`。** 標題講的是這一期的內容，不是它的身分：
 * 對 2443 期正式站資料試跑過，讀標題會把《軟體世界》70+71（春節特別號）、
 * 《電擊王》Vol.12 與《電玩通》No.013／No.044（標題都提到「別冊附錄」）誤判成
 * 特刊，而它們全都拿到了正刊編號。同一次試跑裡，讀標題沒有多抓到任何一筆真的
 * 特刊——這條規則只有壞處。
 *
 * 規則因此是**機械但不完備**的：抓得到把身分寫進期號的那些（「試刊 3 號」
 * 「即時戰爭遊戲特刊」「正宗攻略寶典3」），抓不到只印在封面上的。跑完要人工掃
 * 一遍——這批刊只有幾本有試刊，特刊也是少數。
 *
 * 走 API 而不是直接連資料庫：`PUT /api/issues/[id]` 會寫 `edit_logs`，直接下 SQL
 * 的結果是資料對、歷史缺一塊（見 docs/data-conventions.md）。
 *
 * 冪等：值相同就跳過，重跑不會產生多餘的編輯紀錄。**只往非 REGULAR 改，不往回
 * 改**——人工修正過的期不該被下一次重跑推翻。
 *
 * 用法：
 *   npx tsx scripts/backfill-issue-kind.ts --dry-run
 *   npx tsx scripts/backfill-issue-kind.ts
 *   npx tsx scripts/backfill-issue-kind.ts --base https://tocr.simagame.me
 */
import { productionToken } from "./prod-token";

type IssueKind = "REGULAR" | "PILOT" | "SPECIAL";

/**
 * 「試刊」在前：《攻略快報》的試刊期同時帶著兩種詞的可能，而試刊是更強的宣告
 * ——正式創刊前的東西，不管它自稱什麼，都不在正刊序列裡。
 */
const RULES: { kind: Exclude<IssueKind, "REGULAR">; pattern: RegExp }[] = [
  { kind: "PILOT", pattern: /試刊|創刊準備|預備號/ },
  // 「寶典」是《新遊戲時代》那兩本的其中一本（正宗攻略寶典3）自稱的名目；
  // 另一本叫「攻略特刊①」，走前面的「特刊」。
  { kind: "SPECIAL", pattern: /特刊|增刊|別冊|特別號|產品目錄|寶典/ },
];

interface ApiIssue {
  id: string;
  issueNumber: string;
  kind: IssueKind;
  magazine: { name: string };
}

/** 只看期號：那是雜誌自己給的編號，也就是判準問的那件事。 */
function detect(issue: ApiIssue): IssueKind {
  for (const rule of RULES) {
    if (rule.pattern.test(issue.issueNumber)) return rule.kind;
  }
  return "REGULAR";
}

async function main() {
  const baseIndex = process.argv.indexOf("--base");
  const base = baseIndex === -1 ? "http://localhost:3000" : process.argv[baseIndex + 1];
  const dryRun = process.argv.includes("--dry-run");
  const isLocal = base.startsWith("http://localhost");
  // localhost runs with DEV_BYPASS_AUTH, so it needs no credential of its own.
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!isLocal) headers.Authorization = `Bearer ${productionToken()}`;

  // 全站兩千多期，API 每頁最多 100（MAX_PAGE_SIZE），所以要翻頁。
  const issues: ApiIssue[] = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${base}/api/issues?limit=100&page=${page}`);
    if (!res.ok) throw new Error(`GET /api/issues 失敗：HTTP ${res.status}`);
    const body = await res.json();
    const batch: ApiIssue[] = Array.isArray(body) ? body : body.data;
    if (batch.length === 0) break;
    issues.push(...batch);
    if (batch.length < 100) break;
  }

  let written = 0;
  const counts: Record<IssueKind, number> = { REGULAR: 0, PILOT: 0, SPECIAL: 0 };

  for (const issue of issues) {
    const wanted = detect(issue);
    counts[wanted]++;
    // 只往非 REGULAR 改：規則讀不出來的期一律留在原值，人工設過的不被推翻。
    if (wanted === "REGULAR" || issue.kind === wanted) continue;

    const label = `${issue.magazine.name} ${issue.issueNumber}`;
    if (dryRun) {
      console.log(`  · ${label} -> ${wanted}`);
      written++;
      continue;
    }

    const put = await fetch(`${base}/api/issues/${issue.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ kind: wanted }),
    });
    if (!put.ok) {
      console.error(`  ✗ ${label}: HTTP ${put.status}`);
      continue;
    }
    console.log(`  ✓ ${label} -> ${wanted}`);
    written++;
  }

  console.log(
    `\n${dryRun ? "（試跑）" : ""}${written} 期已改，共掃過 ${issues.length} 期` +
      `（規則判為 試刊 ${counts.PILOT}、特刊 ${counts.SPECIAL}）`
  );
  console.log("規則只讀得到期號，身分只印在封面上的要人工補。");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
