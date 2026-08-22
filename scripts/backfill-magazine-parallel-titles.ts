/**
 * 回填 `Magazine.nameParallel`（並列刊名）與 `Magazine.sourceTitle`（原刊刊名）。
 *
 * 值來自逐本查封面刊頭、刊頭小 logo 與官方網域，過程與判準見
 * `docs/plans/2026-08-23-magazine-name-fields-design.md`。原本這些名字散在
 * `aliases` 裡、或根本沒記，導致自印英文名看起來像編輯憑空意譯。
 *
 * **`nameParallel` 存招牌形式，不是最完整的形式。**《電腦玩家》印過 Amazing
 * Computer Entertainment 但自稱 ACE，這裡填 ACE、全名留在 `aliases`；《軟體世界》
 * 封面用過四種寫法，官網是 swm.com.tw，填 SWM。
 *
 * **`sourceTitle` 只在「本刊整體即該外刊的中文版」時才填。**《電腦玩家》取得
 * PC GAMER 的文章授權、封面也標過「PC GAMER 國際中文版」，但它不是那本雜誌，
 * 所以留空——那些標示進 `aliases`。
 *
 * 走 API 而不是直接連資料庫：`PUT /api/magazines/[id]` 會寫 `edit_logs`，
 * 直接下 SQL 的結果是資料對、歷史缺一塊（見 docs/data-conventions.md）。
 *
 * 冪等：值相同就跳過，`aliases` 只做聯集不刪既有值，重跑不會產生多餘的編輯紀錄。
 * 資料庫沒有的 slug 直接略過（各環境收錄的刊物不一樣）。
 *
 * 用法：
 *   npx tsx scripts/backfill-magazine-parallel-titles.ts
 *   npx tsx scripts/backfill-magazine-parallel-titles.ts --base https://tocr.simagame.me
 */
import { productionToken } from "./prod-token";

interface Names {
  /** 刊物自印、與正題名並列的另一語言刊名（招牌形式）。 */
  parallel?: string;
  /** 本刊整體翻譯／授權自哪一本外刊。 */
  source?: string;
  /** 要補進 aliases 的其他寫法與俗稱。 */
  aliases?: string[];
}

const NAMES: Record<string, Names> = {
  // -- 自印並列刊名 --------------------------------------------------------
  // 官網 swm.com.tw、封面小 logo 都是 SWM；封面全名用過四種寫法
  swm: {
    parallel: "SWM",
    aliases: ["SOFT WORLD MONTHLY", "SOFT WORLD MAGAZINE", "COMPUTER SOFT WORLD MAGAZINE MONTHLY"],
  },
  ssm: { parallel: "SOFTSTAR MAGAZINE" },
  // ACE 是刊物自用的代稱；PC GAMER 是中途取得文章授權後才加的封面標示，不是原刊
  ace: {
    parallel: "ACE",
    aliases: ["PC GAMER 國際中文版"],
  },
  // SGM 與 ACE 同：刊物自己就用這個縮寫
  sgm: { parallel: "SGM" },
  next: { parallel: "NEXT GENERATION" },
  gd: { parallel: "Game Developer" },
  gf: { parallel: "GAME FACTORY" },
  rgt: { parallel: "RETRO GAME TIME" },
  tvgm: { parallel: "TV GAME MAGAZINE" },
  // 取自中期封面：創刊期查不到英文名，見設計文件的未決事項
  tvgr: { parallel: "TV.GAME REPORT" },
  vvkids: { parallel: "V KIDS" },
  tvgsg: { parallel: "TV.GAME SUPER GUIDE" },
  astro: { parallel: "ASTRO TV GAMES MAGAZINE" },
  egen: { parallel: "e-Generation Weekly" },
  fashion: { parallel: "FASHION GAME" },
  gpeople: { parallel: "Games People" },
  gtimes: { parallel: "GAME TIMES" },
  gwalker: { parallel: "GAME WALKER" },
  tvgameinfo: { parallel: "TV GAME INFORMATION" },
  vboy: { parallel: "Victory Boy" },
  wolf: { parallel: "WOLF Weekly" },
  cityboy: { parallel: "CITY BOY", aliases: ["CITY BOY GAME MAGAZINE"] },

  // -- 外刊的中文版 --------------------------------------------------------
  cgw: { source: "Computer Gaming World" },
  "dps-tw": { source: "電撃PlayStation" },
  "dss-tw": { source: "電撃セガサターン" },
  "doh-tw": { source: "電撃王" },
  "fmt-tw": { source: "ファミ通" },
  "fmtps-tw": { source: "ファミ通PS2" },
  "hps-tw": { source: "HYPER PlayStation" },
  oxm: { source: "Official Xbox Magazine" },
  // 封面與內容都直接翻版自德間書店的《ファミリーコンピュータ Magazine》
  //（未經授權，見 docs/data-conventions.md 的期號一節）。封面沒有英文，所以它有
  // sourceTitle 而沒有 nameParallel——與另外兩本「確認無拉丁刊名」的原創刊
  //（精訊電腦、電玩百分百週刊）不同
  htntd: { source: "ファミリーコンピュータ Magazine" },
};

interface ApiMagazine {
  id: string;
  slug: string;
  name: string;
  nameParallel?: string | null;
  sourceTitle?: string | null;
  aliases?: string[];
}

async function main() {
  const baseIndex = process.argv.indexOf("--base");
  const base = baseIndex === -1 ? "http://localhost:3000" : process.argv[baseIndex + 1];
  const isLocal = base.startsWith("http://localhost");
  // localhost runs with DEV_BYPASS_AUTH, so it needs no credential of its own.
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!isLocal) headers.Authorization = `Bearer ${productionToken()}`;

  const res = await fetch(`${base}/api/magazines?limit=200`);
  const body = await res.json();
  const magazines: ApiMagazine[] = Array.isArray(body) ? body : body.data;

  let written = 0;
  const absent: string[] = [];
  const seen = new Set<string>();

  for (const magazine of magazines) {
    const wanted = NAMES[magazine.slug];
    if (!wanted) continue;
    seen.add(magazine.slug);

    const payload: Record<string, unknown> = {};
    if (wanted.parallel && magazine.nameParallel !== wanted.parallel) {
      payload.nameParallel = wanted.parallel;
    }
    if (wanted.source && magazine.sourceTitle !== wanted.source) {
      payload.sourceTitle = wanted.source;
    }
    // 聯集而不是取代：後台補的別名要活過重跑，這也讓腳本冪等。
    const current = magazine.aliases ?? [];
    const missing = (wanted.aliases ?? []).filter((a) => !current.includes(a));
    if (missing.length) payload.aliases = [...current, ...missing];

    if (Object.keys(payload).length === 0) continue;

    const put = await fetch(`${base}/api/magazines/${magazine.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });
    if (!put.ok) {
      console.error(`  ✗ ${magazine.name}: HTTP ${put.status}`);
      continue;
    }
    console.log(`  ✓ ${magazine.name} -> ${JSON.stringify(payload)}`);
    written++;
  }

  for (const slug of Object.keys(NAMES)) {
    if (!seen.has(slug)) absent.push(slug);
  }

  console.log(`\n${written} 本已回填，${magazines.length} 本中`);
  if (absent.length) {
    console.log(`這個環境沒有的 slug（略過）：${absent.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
