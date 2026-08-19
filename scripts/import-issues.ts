/**
 * 從懷舊圖書館 Google Sheet 匯入一本雜誌的單期資料，並選擇性上傳封面。
 *
 * 這支取代了每次匯入都重寫一遍的臨時腳本。Sheet 是上游正本（見
 * docs/data-conventions.md 與 nostalibrary），欄位對應也記在那裡：`title` 取
 * 期號、`description` 才是特輯標題、`cover` 是封面內容不是圖檔路徑。
 *
 * 走 API 而不是直接連資料庫：`POST /api/issues` 會驗 EDTF、推導 `publishSort`
 * 與 slug，並寫 `edit_logs`。直接下 SQL 的結果是資料對、歷史缺一塊。
 *
 * 冪等：以 slug 比對，既有的期數跳過。所以中斷之後重跑是安全的。
 *
 * ## Sheet 匯出
 *
 * 先把要用的分頁存成 JSON（`gws` 的輸出開頭有一行 keyring 訊息要濾掉）：
 *
 *   gws sheets spreadsheets values get --params '{"spreadsheetId":"<id>","range":"雜誌1!A1:R5000"}' \
 *     | grep -v '^Using keyring' > /tmp/雜誌1.json
 *
 * spreadsheetId 見 docs/data-conventions.md。分頁與刊物的對應：雜誌1 是
 * swm/ace/cgw/sgm/mania/next/ssm/jxdn，雜誌2、雜誌3 各有自己那批。
 *
 * ## 用法
 *
 *   npx tsx scripts/import-issues.ts <期刊名> --sheet <path.json>
 *   npx tsx scripts/import-issues.ts 精訊電腦 --sheet /tmp/雜誌1.json --apply
 *   npx tsx scripts/import-issues.ts 精訊電腦 --sheet /tmp/雜誌1.json \
 *     --base https://tocr.simagame.me --covers ~/works/nostalibrary/assets/images/covers_m --apply
 *
 * 不帶 `--apply` 就是 dry run，只印出會做什麼。
 *
 * 打正式站需要 API token，從 keychain 取（見 docs/deployment.md）：
 *   security find-generic-password -s tocr-prod-api-token -a "$USER" -w
 *
 * 上傳封面需要 `BLOB_READ_WRITE_TOKEN`，用 `--env-file=.env.local` 帶進來。
 * **dev 與 production 共用同一個 blob store**，所以封面只需要傳一次，兩邊的
 * `coverImage` 網址完全相同。
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { put } from "@vercel/blob";

type Row = Record<string, string>;

interface MagazineRule {
  /** 出版日推定。Sheet 沒有日期、但出刊節奏已知時才給。 */
  derivePublishDate?: (issueOrder: number) => string;
  /** 出版日確知的期別（以 `weight` 為準）；其餘標 EDTF `~`。 */
  knownDates?: Set<number>;
  /** 推定的依據，寫進 `notes`。 */
  derivedNote?: string;
  /** 推導出來的 slug 不好看時，指定一個。 */
  slugFor?: (issueNumber: string) => string | undefined;
  /** Sheet 沒有、但已知的欄位。 */
  overrides?: Record<number, { pageCount?: number; note?: string }>;
}

const pad = (n: number) => String(n).padStart(2, "0");

function addMonths(year: number, month: number, add: number) {
  const total = month - 1 + add;
  return { year: year + Math.floor(total / 12), month: (total % 12) + 1 };
}

/**
 * 《次世代遊戲情報》的出刊節奏。
 *
 *   No.1–13   半月刊，每月 1 日與 16 日出刊，自 1998-08-01 起
 *   No.14 起  月刊，每月 25 日出刊，自 1999-02-25 起；封面月號為次月
 *
 * Sheet 只有 5 期填了完整日期，但這條規則對得上 13 個獨立資料點（6 個已知
 * 出版日、7 個標題裡的月號）且零例外，推出的 No.35 = 2000 年 12 月號、
 * No.56 = 2002 年 9 月號也對上已知的特別號與終刊。
 */
function nextGenPublishDate(n: number): string {
  if (n <= 13) {
    const { year, month } = addMonths(1998, 8, Math.floor((n - 1) / 2));
    return `${year}-${pad(month)}-${n % 2 ? "01" : "16"}`;
  }
  const { year, month } = addMonths(1999, 2, n - 14);
  return `${year}-${pad(month)}-25`;
}

const CJK_NUMERALS: Record<string, string> = { 一: "1", 二: "2", 三: "3", 四: "4", 五: "5" };

const RULES: Record<string, MagazineRule> = {
  "Mania 遊戲玩瘋誌": {
    // 創刊〔一〕號 推導出來是 `創刊-一-號`。專名的寫法見 data-conventions.md。
    slugFor: (issueNumber) => {
      const m = issueNumber.match(/^創刊〔(.)〕號$/);
      return m && CJK_NUMERALS[m[1]] ? `創刊${CJK_NUMERALS[m[1]]}號` : undefined;
    },
  },
  次世代遊戲情報: {
    derivePublishDate: nextGenPublishDate,
    // Sheet 有完整日期的 5 期，加上文獻直接寫出改為月刊的第 14 期。
    knownDates: new Set([1, 2, 14, 16, 17, 19]),
    derivedNote:
      "出版日為推定：創刊起為半月刊、每月 1 日與 16 日出刊，第 14 期起改為月刊、" +
      "每月 25 日出刊（封面月號為次月）。未經查證。",
    overrides: { 35: { pageCount: 432, note: "揮別 20 世紀特別號，加厚至 432 頁全彩。" } },
  },
};

function productionToken(): string {
  return execFileSync("security", [
    "find-generic-password", "-s", "tocr-prod-api-token", "-a", process.env.USER ?? "", "-w",
  ]).toString().trim();
}

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

/** 期號是標題去掉刊名之後的第一段；其餘是日期表述，不是期號。 */
function issueNumberFrom(title: string, series: string): string {
  let rest = title.trim();
  // Sheet 的標題未必用 series 的全名（「軟體世界雜誌」的標題寫「軟體世界」）
  for (const prefix of [series, series.replace(/雜誌$/, "")]) {
    if (rest.startsWith(prefix)) {
      rest = rest.slice(prefix.length).trim();
      break;
    }
  }
  return rest.split(/\s+/)[0] || title;
}

/** 與 issueSlugify 同樣的判斷，用來比對站上已有哪幾期。 */
function probeSlug(issueNumber: string): string {
  return issueNumber.replace(/^(no\.?|vol\.?)0*/i, "").trim() || issueNumber;
}

/** 封面內容與附件併進 notes——見 docs/data-conventions.md。 */
function notesFrom(row: Row, extra: (string | undefined)[]): string | undefined {
  const parts = [
    row.cover?.trim() && `封面：${row.cover.trim()}`,
    row.attachments?.trim() && `附件：${row.attachments.trim()}`,
    ...extra,
    row.notes?.trim(),
  ].filter(Boolean);
  return parts.length ? parts.join("\n") : undefined;
}

async function main() {
  const series = process.argv[2];
  const sheetPath = flag("--sheet");
  const coversDir = flag("--covers");
  const base = flag("--base") ?? "http://localhost:3000";
  const apply = process.argv.includes("--apply");

  if (!series || !sheetPath) {
    console.error("用法：import-issues.ts <期刊名> --sheet <path.json> [--base URL] [--covers DIR] [--apply]");
    process.exitCode = 1;
    return;
  }

  const isLocal = base.startsWith("http://localhost");
  // localhost 跑在 DEV_BYPASS_AUTH 下，不需要自己的憑證。
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!isLocal) headers.Authorization = `Bearer ${productionToken()}`;

  const sheet = JSON.parse(readFileSync(sheetPath, "utf8"));
  const [header, ...body] = sheet.values as string[][];
  const rows: Row[] = body
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])) as Row)
    .filter((r) => r.series === series);
  if (rows.length === 0) throw new Error(`${sheetPath} 裡找不到 series「${series}」`);

  const rule = RULES[series] ?? {};

  const magazines = await (await fetch(`${base}/api/magazines?limit=200`)).json();
  const magazine = (magazines.data ?? magazines).find((m: { name: string }) => m.name === series);
  if (!magazine) throw new Error(`${base} 沒有期刊「${series}」`);

  // 查既有期數要分頁：/api/magazines/[id] 只回 10 筆。
  const existing = new Map<string, { id: string; coverImage: string | null }>();
  for (let page = 1; ; page++) {
    const res = await (
      await fetch(`${base}/api/issues?magazineId=${magazine.id}&limit=100&page=${page}`)
    ).json();
    for (const i of res.data) existing.set(i.slug, { id: i.id, coverImage: i.coverImage });
    if (page >= (res.pagination?.totalPages ?? 1)) break;
  }

  console.log(`${series} [${magazine.id}] @ ${base}`);
  console.log(`sheet ${rows.length} 期，站上已有 ${existing.size} 期${apply ? "" : "（dry run）"}\n`);

  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const order = Number(row.weight);
    const issueNumber = issueNumberFrom(row.title, series);
    const slug = rule.slugFor?.(issueNumber);
    const key = slug ?? probeSlug(issueNumber);

    if (existing.has(key)) {
      skipped++;
      continue;
    }

    const sheetDate = row.publish_date.trim();
    let publishDate = sheetDate;
    let derivedNote: string | undefined;
    if (rule.derivePublishDate) {
      const derived = rule.derivePublishDate(order);
      // Sheet 有完整日期時拿來驗規則：偏離就是規則錯了，不該默默採用其中一個。
      if (sheetDate.length === 10 && sheetDate !== derived) {
        throw new Error(`第 ${order} 期 sheet 是 ${sheetDate}，推定是 ${derived}——規則要重看`);
      }
      const known = rule.knownDates?.has(order) ?? false;
      publishDate = known ? derived : `${derived}~`;
      if (!known) derivedNote = rule.derivedNote;
    }
    if (!publishDate) {
      console.error(`  ! 第 ${order} 期沒有出版日期，而該欄必填——跳過`);
      continue;
    }

    const override = rule.overrides?.[order];
    const payload = {
      magazineId: magazine.id,
      issueNumber,
      ...(slug ? { slug } : {}),
      publishDate,
      title: row.description?.trim() || undefined,
      price: row.price?.trim() || undefined,
      pageCount: override?.pageCount ?? (row.num_pages?.trim() || undefined),
      notes: notesFrom(row, [override?.note, derivedNote]),
      order,
    };

    if (!apply) {
      console.log(`  + ${issueNumber.padEnd(12)} ${publishDate.padEnd(12)} order=${order}`);
      // 登記下來，否則 dry run 的封面統計會把「還沒建立」誤報成「沒有圖檔」。
      existing.set(key, { id: `(dry-run:${order})`, coverImage: null });
      created++;
      continue;
    }

    const res = await fetch(`${base}/api/issues`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`第 ${order} 期建立失敗：${res.status} ${await res.text()}`);
    const issue = await res.json();
    existing.set(issue.slug, { id: issue.id, coverImage: issue.coverImage });
    created++;
  }

  console.log(`\n${apply ? "已建立" : "會建立"} ${created} 期，跳過 ${skipped} 期（已存在）`);

  if (coversDir) await uploadCovers({ rows, series, rule, coversDir, base, headers, apply, existing });
  if (!apply) console.log("\n這是 dry run。要實際寫入請加 --apply");
}

async function uploadCovers({
  rows, series, rule, coversDir, base, headers, apply, existing,
}: {
  rows: Row[];
  series: string;
  rule: MagazineRule;
  coversDir: string;
  base: string;
  headers: Record<string, string>;
  apply: boolean;
  existing: Map<string, { id: string; coverImage: string | null }>;
}) {
  let uploaded = 0;
  let missing = 0;
  let already = 0;

  for (const row of rows) {
    // covers_m 已經是處理過的 medium 變體，不需要再壓縮——所以不走
    // /api/upload，那條路會再跑一次 optimizeImage 並改成亂數檔名。
    const file = `${coversDir}/${row.id}_cover_m.jpg`;
    if (!existsSync(file)) {
      missing++;
      continue;
    }
    const issueNumber = issueNumberFrom(row.title, series);
    const issue = existing.get(rule.slugFor?.(issueNumber) ?? probeSlug(issueNumber));
    if (!issue) {
      missing++;
      continue;
    }
    if (issue.coverImage) {
      already++;
      continue;
    }
    if (!apply) {
      uploaded++;
      continue;
    }

    const blob = await put(`issues/covers/${row.id}.jpg`, readFileSync(file), {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    const res = await fetch(`${base}/api/issues/${issue.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ coverImage: blob.url }),
    });
    if (!res.ok) throw new Error(`${row.id} 封面掛載失敗：${res.status} ${await res.text()}`);
    uploaded++;
  }

  console.log(
    `封面：${apply ? "已上傳" : "會上傳"} ${uploaded} 張，` +
      `${already} 張已有，${missing} 期沒有圖檔`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
