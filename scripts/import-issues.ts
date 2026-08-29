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
 * spreadsheetId、四個雜誌分頁各收哪些刊、以及 `series` 欄的兩個坑（改名的刊是兩
 * 個值、有些列根本沒填）都記在 docs/data-conventions.md 的「上游資料來源」。
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
 *   security find-generic-password -s tocr-prod-token-claude -a "$USER" -w
 *
 * 上傳封面需要 `BLOB_READ_WRITE_TOKEN`，用 `--env-file=.env.local` 帶進來。
 * **dev 與 production 共用同一個 blob store**，所以封面只需要傳一次，兩邊的
 * `coverImage` 網址完全相同。
 */
import { readFileSync, existsSync } from "node:fs";
import { put } from "@vercel/blob";
import { productionToken } from "./prod-token";

type Row = Record<string, string>;

interface MagazineRule {
  /** 出版日推定。Sheet 沒有日期、但出刊節奏已知時才給。 */
  derivePublishDate?: (issueOrder: number) => string;
  /** 出版日確知的期別（以 `weight` 為準）；其餘標 EDTF `~`。 */
  knownDates?: Set<number>;
  /** 推定的依據，寫進 `notes`。 */
  derivedNote?: string;
  /** 推導出來的 slug 不好看、或會與另一段編號序列相撞時，指定一個。 */
  slugFor?: (issueNumber: string, row: Row) => string | undefined;
  /** Sheet 沒有、但已知的欄位。 */
  overrides?: Record<number, { pageCount?: number; note?: string }>;
  /** 同一本刊在 Sheet 裡的其他 series 值——改名之後那一段。 */
  seriesAliases?: string[];
  /** series 欄整批空白的刊（見 data-conventions「上游資料來源」），改以 id 前綴挑列。 */
  idPrefix?: string;
  /** weight 欄空白時，從整列推 order。 */
  orderFor?: (row: Row) => number | undefined;
  /** 出版日真的無從推起的刊：留空匯入（publishDate 可空），而不是整期跳過。 */
  allowMissingDate?: boolean;
  /** 標題不是「刊名＋期號」時（例如改名之後），自己取期號。 */
  issueNumberFor?: (row: Row) => string | undefined;
  /** Sheet 沒填日期、或該欄記的不是出版日時的推定；回傳值優先於 Sheet 字面值。 */
  publishDateFrom?: (row: Row) => { date: string; note?: string } | undefined;
  /** 同一期印的其他編號——見 docs/data-conventions.md。 */
  altNumbersFor?: (row: Row) => string[];
}

const pad = (n: number) => String(n).padStart(2, "0");

function addMonths(year: number, month: number, add: number) {
  const total = month - 1 + add;
  return { year: year + Math.floor(total / 12), month: (total % 12) + 1 };
}

/** 電玩通 PlayStation 系（fmtps-tw）的列，編號在 id 尾碼：fmtps-tw_no-103 → 103。 */
function fmtpsNumber(row: Row): number {
  return Number(row.id.match(/no-(\d+)$/)?.[1] ?? NaN);
}

/** id 尾碼的編號：gtimes_no-011 → 11、game100_proto-002 → 2。 */
function idNumber(row: Row): number {
  return Number(row.id.match(/-(\d+)$/)?.[1] ?? NaN);
}

/** `weight` 欄整批空白的刊：試刊號排在正刊之前，其餘照 id 尾碼接下去。 */
function orderAfterProtos(protoCount: number) {
  return (row: Row) => {
    const n = idNumber(row);
    if (Number.isNaN(n)) return undefined;
    return row.id.includes("_proto-") ? n : protoCount + n;
  };
}

/** 標題留白的列（Sheet 只登了 id 與 weight）才需要從 id 補期號。 */
function whenTitleBlank(fn: (n: number) => string) {
  return (row: Row) => (row.title.trim() ? undefined : fn(idNumber(row)));
}

/**
 * 電玩通 PlayStation 系的出刊節奏（VOL.103 起；之前的 PS2 段推不動，見 RULES）。
 *
 *   VOL.103–115  月刊，每月 10 日，自 2007-05-10（改版發行日，確知）
 *   VOL.116–129  月刊，每月 15 日，自 2008-06-15（改版發行日，確知）
 *   VOL.130–132  季刊，仍為 15 日；推出的 VOL.132 = 2010-04-15 正好落在
 *                文獻記載的休刊日上，月刊＋季刊兩段節奏互相印證
 */
function fmtpsPublishDate(n: number): string {
  if (n <= 115) {
    const { year, month } = addMonths(2007, 5, n - 103);
    return `${year}-${pad(month)}-10`;
  }
  const step = n <= 129 ? n - 116 : 13 + (n - 129) * 3;
  const { year, month } = addMonths(2008, 6, step);
  return `${year}-${pad(month)}-15`;
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
  遊戲設計大師: {
    // Sheet 一期都沒有出版日，但 21 期的標題都寫了封面雙月號。取雙月號的第一
    // 個月、EDTF 月精度並標 `~`：不知道是哪一天，就不要捏一個日出來。
    publishDateFrom: (row) => {
      const m = row.title.match(/(\d{4})\s*(\d{1,2})~(\d{1,2})月號/);
      if (!m) return undefined;
      return {
        date: `${m[1]}-${pad(Number(m[2]))}~`,
        note:
          `出版日期不詳：Sheet 未載，此處取封面雙月號（${m[1]} 年 ` +
          `${Number(m[2])}~${Number(m[3])} 月號）的第一個月，僅精確到月且標為約略。未經查證。`,
      };
    },
  },
  電擊王: {
    // 24 期後改名 DengekiGAMES，先接 Vol.26 再重排從 Vol.2 —— 同一刊裡於是有
    // 兩個語意不同的「Vol.2」。改名後那段的 slug 加 dg- 前綴分開，見
    // docs/data-conventions.md。
    seriesAliases: ["電擊王,DengekiGAMES"],
    // `@@unique([magazineId, issueNumber])` 也擋著，所以期號本身也得分得出兩段
    // 序列——封面上印的正是「DengekiGAMES Vol.2」。
    issueNumberFor: (row) =>
      isDengekiGames(row) ? `DengekiGAMES ${dengekiNumber(row)}` : undefined,
    slugFor: (_issueNumber, row) =>
      isDengekiGames(row) ? `dg-${probeSlug(dengekiNumber(row))}` : undefined,
  },
  電玩通: {
    // 一期印了好幾套編號：總號（No.001）、日期發行號、期別。slug 用日期發行
    // 號、其餘進 altNumbers —— 見 docs/data-conventions.md。合併號取第一個日期。
    slugFor: (_issueNumber, row) => {
      const m = row.title.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
      // 有四期的標題沒寫日期發行號；這份 Sheet 的 publish_date 記的正是它。
      return m
        ? `${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`
        : row.publish_date.trim() || undefined;
    },
    altNumbersFor: (row) => [...row.title.matchAll(/（(.*?)）/g)].map((m) => m[1]),
  },
  電玩通PS2: {
    // 雜誌3 這批列的 series 欄大多空白（只有 VOL.103–115 填了
    // 「電玩通PLAYSTATION+」），以 id 前綴挑列；weight 同樣大多空白，
    // order 從 id 尾碼取。Sheet 目前只到 no-129，季刊的 VOL.130–132 還沒有列。
    idPrefix: "fmtps-tw_no-",
    orderFor: fmtpsNumber,
    // 期號照封面印刷：PS2 段是「No.001」、改版後是「VOL.103」。no-102 與
    // no-116–129 在 Sheet 沒有 title，一律從 id 推，不依賴 title 欄。
    issueNumberFor: (row) => {
      const n = fmtpsNumber(row);
      return n <= 102 ? `No.${String(n).padStart(3, "0")}` : `VOL.${n}`;
    },
    // Sheet 的 publish_date 記的是封面月號不是發行日（VOL.103 封面 2007 年
    // 6 月號、Sheet 填 2007-06-10，文獻記載實際發行 2007-05-10，正好差一個
    // 月），所以整欄不能照抄，改用節奏推：
    //   VOL.1–102   半月刊，只有創刊日一個錨點，102 期推不動——誠實留空
    //   VOL.103 起  見 fmtpsPublishDate；103、116（改版發行日）與 132
    //               （休刊日）為文獻確知，其餘標 ~
    publishDateFrom: (row) => {
      const n = fmtpsNumber(row);
      if (n <= 102) return undefined;
      const derived = fmtpsPublishDate(n);
      // Sheet 那欄若有值，必須等於「推定發行月＋1」的封面月號，否則規則要重看。
      const sheetDate = row.publish_date.trim();
      if (sheetDate) {
        const [y, m] = derived.split("-").map(Number);
        const cover = addMonths(y, m, 1);
        const expected = `${cover.year}-${pad(cover.month)}-10`;
        if (sheetDate !== expected) {
          throw new Error(`VOL.${n} sheet 是 ${sheetDate}，封面月號推定是 ${expected}——規則要重看`);
        }
      }
      if (n === 103 || n === 116 || n === 132) return { date: derived };
      return {
        date: `${derived}~`,
        note:
          "出版日為推定：VOL.103 起月刊每月 10 日（自 2007-05-10 改版發行），" +
          "VOL.116 起月刊每月 15 日（自 2008-06-15 改版發行）、VOL.130 起季刊。" +
          "Sheet 的日期欄記的是封面月號。未經查證。",
      };
    },
    allowMissingDate: true,
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
  電玩時代: {
    // 整批沒有 weight，order 照 id 尾碼推：3 期試刊在前，正刊接在後面。
    orderFor: orderAfterProtos(3),
  },
  勝利少年: {
    // Sheet 只有創刊號與 VOL.10 兩列有內容，中間 9 列是全空的佔位列（讀入時濾掉）。
    orderFor: orderAfterProtos(0),
  },
  電玩百分百週刊: { orderFor: orderAfterProtos(0) },
  電遊通訊: { orderFor: orderAfterProtos(0) },
  電玩族雜誌: {
    // 前 4 期 Sheet 只登了 id 與 weight，標題留白。
    issueNumberFor: whenTitleBlank((n) => `No.${n}`),
    allowMissingDate: true,
  },
  "Official Xbox Magazine": {
    // 24 期裡 16 期標題留白，同樣照 id 尾碼補期號。
    issueNumberFor: whenTitleBlank((n) => `No.${n}`),
    allowMissingDate: true,
  },
  "電擊SEGA SATURN": {
    // 試刊 2、3 號標題留白。
    issueNumberFor: whenTitleBlank((n) => `試刊${n}號`),
    allowMissingDate: true,
  },
  電擊PlayStation: {
    // 74 期只有 22 期查得到出版日，其餘留空——見 data-conventions 的取值優先序。
    allowMissingDate: true,
  },
  舊遊戲時代: {
    // Sheet 這一批只有標題與 weight，連 id 都還沒編。
    allowMissingDate: true,
  },
  飛訊電玩周刊: {
    // 88 列標題留白，而且有一列把 No.46 的標題誤植成 No.42，會跟真正的 No.42 撞
    // `@@unique([magazineId, issueNumber])`。所以期號一律照 id 推，不看標題。
    issueNumberFor: (row) => {
      const m = row.id.match(/^fashion_(proto|no)-(\d+)(?:-(\d+))?$/);
      if (!m) return undefined;
      const n = Number(m[2]);
      if (m[1] === "proto") return `試刊${n}號`;
      if (n === 1) return "創刊1號";
      return m[3] ? `No.${n}.${Number(m[3])}` : `No.${n}`;
    },
    // 合併號推出來的 slug 會帶小數點（`38.39`），改成 `38-39`。
    slugFor: (issueNumber) => {
      const m = issueNumber.match(/^No\.(\d+)\.(\d+)$/);
      return m ? `${m[1]}-${m[2]}` : undefined;
    },
    allowMissingDate: true,
  },
  "新世紀 HYPER PlayStation": {
    // 期號逐年重編（1999、2000、2001 各有一組 VOL.x），年份因此是期號的一部分；
    // 只留 VOL.x 的話同一刊裡會冒出三個 VOL.11。
    issueNumberFor: (row) => {
      const m = row.title.match(/(\d{4})\s+(\S+)$/);
      return m ? `${m[1]} ${m[2]}` : undefined;
    },
    slugFor: (issueNumber) => {
      const m = issueNumber.match(/^(\d{4})\s+(.+)$/);
      return m ? `${m[1]}-${probeSlug(m[2]).replace(/[/+]/g, "-")}` : undefined;
    },
  },
  華泰任天堂秘笈: {
    // 首期即第 5 期（見 data-conventions 的「期號」）。前兩期封面印的是另一個
    // 題名，照標題取會把題名當成期號，所以期號一律照 id 推。
    issueNumberFor: (row) => String(idNumber(row)),
    overrides: {
      5: { note: "封面題名：任天堂程式解法大公開 5" },
      6: { note: "封面題名：任天堂程式解法大公開 6" },
    },
    // 24 期一期都查不到出版日期，誠實留空。
    allowMissingDate: true,
  },
  電視遊樂雜誌: {
    seriesAliases: ["電視遊樂雜誌,GAMEfans"],
    // 這本刊的題名換過兩次（電視遊樂快訊 → 電視遊樂雜誌 → GAMEfans），標題
    // 開頭因此不一定是 series 的值。
    issueNumberFor: (row) => {
      for (const prefix of ["電視遊樂快訊", "電視遊樂雜誌", "GAMEfans"]) {
        if (row.title.startsWith(prefix)) {
          return row.title.slice(prefix.length).trim().split(/\s+/)[0];
        }
      }
      return undefined;
    },
    allowMissingDate: true,
  },
  電視遊樂報導: {
    seriesAliases: ["電視遊樂報導,SuperGamer", "電視遊樂報導,電視遊樂雜誌"],
    // 改名 SuperGamer 之後期號重編，同一刊於是有兩組序列。照《電擊王》的做法：
    // 期號保留封面印的全稱、slug 加 `sg-` 前綴分開，原本的報導期號進 altNumbers。
    // 另有一期是與《電視遊樂雜誌》合刊的新春合併號，掛在報導底下並註明。
    issueNumberFor: (row) => {
      if (row.id.startsWith("tvgr_tvgm_comb-")) return "1998新春合併號";
      const m = row.title.match(/^SuperGamer\s+(\S+)/);
      return m ? `SuperGamer ${m[1]}` : undefined;
    },
    slugFor: (issueNumber, row) => {
      if (row.id.startsWith("tvgr_tvgm_comb-")) return "comb-1998-new-year";
      const m = issueNumber.match(/^SuperGamer\s+(\S+)$/);
      return m ? `sg-${probeSlug(m[1])}` : undefined;
    },
    altNumbersFor: (row) => [...row.title.matchAll(/[（(](.*?)[)）]/g)].map((m) => m[1]),
    overrides: { 400: { note: "《電視遊樂報導》與《電視遊樂雜誌》合刊的新春合併號。" } },
    allowMissingDate: true,
  },
};

/** 《電擊王》改名之後那一段，Sheet 的 series 是「電擊王,DengekiGAMES」。 */
function isDengekiGames(row: Row): boolean {
  return row.series.includes("DengekiGAMES");
}

/** 改名之後標題就從刊名 DengekiGAMES 起頭，不再是「電擊王」。 */
function dengekiNumber(row: Row): string {
  return issueNumberFrom(row.title, "DengekiGAMES");
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

/** 一列在站上的身分：期號、指定的 slug，以及用來比對既有期數的鍵。 */
function entryOf(row: Row, series: string, rule: MagazineRule) {
  const issueNumber = rule.issueNumberFor?.(row) ?? issueNumberFrom(row.title, series);
  const slug = rule.slugFor?.(issueNumber, row);
  return { issueNumber, slug, key: slug ?? probeSlug(issueNumber) };
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
  const rule = RULES[series] ?? {};
  // 改名過的刊在 Sheet 裡是兩個 series 值，但在站上是同一本。
  const seriesValues = new Set([series, ...(rule.seriesAliases ?? [])]);
  const rows: Row[] = body
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])) as Row)
    .filter(
      (r) =>
        seriesValues.has(r.series) ||
        (rule.idPrefix !== undefined && r.id.startsWith(rule.idPrefix))
    )
    // Sheet 用全空的列佔住還沒查到的那幾期（《勝利少年》有 9 列）。那是位置，
    // 不是資料，建成期數只會多出一批查不到任何東西的空殼。
    .filter((r) => r.id.trim() || r.title.trim());
  if (rows.length === 0) throw new Error(`${sheetPath} 裡找不到 series「${series}」`);

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
    const order = rule.orderFor?.(row) ?? Number(row.weight);
    const { issueNumber, slug, key } = entryOf(row, series, rule);

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
    if (rule.publishDateFrom) {
      const derived = rule.publishDateFrom(row);
      if (derived) {
        publishDate = derived.date;
        derivedNote = derived.note;
      }
    }
    if (!publishDate && !rule.allowMissingDate) {
      console.error(`  ! 第 ${order} 期沒有出版日期——跳過`);
      continue;
    }

    const override = rule.overrides?.[order];
    const altNumbers = rule.altNumbersFor?.(row) ?? [];
    const payload = {
      magazineId: magazine.id,
      issueNumber,
      ...(slug ? { slug } : {}),
      ...(altNumbers.length ? { altNumbers } : {}),
      ...(publishDate ? { publishDate } : {}),
      title: row.description?.trim() || undefined,
      price: row.price?.trim() || undefined,
      pageCount: override?.pageCount ?? (row.num_pages?.trim() || undefined),
      notes: notesFrom(row, [override?.note, derivedNote]),
      order,
    };

    if (!apply) {
      console.log(
        `  + ${issueNumber.padEnd(12)} ${(publishDate || "(無日期)").padEnd(12)} ${key.padEnd(12)} order=${order}`
      );
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
    const issue = existing.get(entryOf(row, series, rule).key);
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
