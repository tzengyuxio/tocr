/**
 * 把 `Magazine.slug` 換成規範算出來的值。
 *
 * 規則、推導過程與 34 本的新舊對照表見
 * `docs/plans/2026-08-23-magazine-slug-convention-design.md`。這份腳本只是把那張表
 * 打進站上，不做任何判斷——新值有疑義時改文件，不要改這裡。
 *
 * 走 API 而不是直接連資料庫：`PUT /api/magazines/[id]` 會在同一個 transaction 裡
 * 把舊代號收進 `MagazineSlug`（舊連結靠它 308 轉址），也會寫 `edit_logs`。
 * 直接下 SQL 的結果是資料對、轉址與歷史各缺一塊。
 *
 * 冪等：值相同就跳過，重跑不會產生多餘的編輯紀錄，也不會再退役一次。
 * 資料庫沒有的 slug 直接略過（各環境收錄的刊物不一樣）。
 *
 * 用法（預設 dry run，加 --apply 才真的寫）：
 *   npx tsx scripts/apply-magazine-slugs.ts
 *   npx tsx scripts/apply-magazine-slugs.ts --apply
 *   npx tsx scripts/apply-magazine-slugs.ts --base https://tocr.simagame.me --apply
 */
import { productionToken } from "./prod-token";

/** 現行 slug -> 新 slug。與設計文件的對照表逐列對應。 */
const SLUGS: Record<string, string> = {
  // -- 規則 1：刊物自印的並列刊名 ------------------------------------------
  swm: "swm", // 自稱簡稱，值不變
  ssm: "softstar",
  ace: "ace", // 自稱簡稱，值不變
  sgm: "sgm", // 自稱簡稱，值不變
  gd: "game-developer",
  gf: "game-factory",
  mania: "mania",
  rgt: "retro-game-time",
  tvgm: "tvgame-magazine",
  tvgr: "tvgame-report",
  vvkids: "vv-kids",
  tvgsg: "tvgame-super-guide",
  astro: "astro", // 自稱簡稱，值不變
  egen: "e-generation",
  fashion: "fashion-game",
  gpeople: "games-people",
  gtimes: "game-times",
  gwalker: "game-walker",
  tvgameinfo: "tvgame-information",
  vboy: "victory-boy",
  wolf: "wolf",
  cityboy: "city-boy",
  sggw: "sg-game",
  // 規則算出來是 onlinegame（創刊名的並列刊名），這是規範裡唯一的明文例外：
  // 創刊期的名字識別力不足，取後期的 GAMEXPRESS。判準見設計文件
  gamexpress: "gamexpress",

  // -- 規則 2：外刊的授權版／翻譯版，原刊通稱 + -tw --------------------------
  cgw: "cgw-tw",
  next: "next-tw",
  htntd: "famimaga-tw",
  "dps-tw": "dengeki-ps-tw",
  "dss-tw": "dengeki-ss-tw",
  "doh-tw": "dengeki-oh-tw",
  "fmt-tw": "famitsu-tw",
  "fmtps-tw": "famitsu-ps2-tw",
  "hps-tw": "hyper-ps-tw",
  oxm: "oxm-tw",

  // -- 規則 3：漢語拼音，首詞 + 末詞 ----------------------------------------
  jxdn: "jingxun-diannao",
  game100: "dianwan-baifenbai",
  astronews: "astro-kuaibao", // 無拉丁刊名，主體跟隨《星際遊樂雜誌》的 astro
  // newgen（3DO／次世代總合情報誌）暫定 3do-qingbao，封面尚未查證，兩站都還沒建檔
};

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  const base = flag("--base") ?? "http://localhost:3000";
  const apply = process.argv.includes("--apply");

  const isLocal = base.startsWith("http://localhost");
  // localhost 跑在 DEV_BYPASS_AUTH 下，不需要自己的憑證。
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!isLocal) headers.Authorization = `Bearer ${productionToken()}`;

  const res = await (await fetch(`${base}/api/magazines?limit=200`)).json();
  const magazines: { id: string; name: string; slug: string }[] = res.data ?? res;

  console.log(`${base}：站上 ${magazines.length} 本${apply ? "" : "（dry run）"}\n`);

  let changed = 0;
  let same = 0;
  const failed: string[] = [];

  for (const magazine of magazines) {
    const next = SLUGS[magazine.slug];
    if (!next) {
      // 已經是新值的話重跑會走到這裡，不算漏網。
      if (Object.values(SLUGS).includes(magazine.slug)) same++;
      else failed.push(`${magazine.name}：對照表沒有 ${magazine.slug}`);
      continue;
    }
    if (next === magazine.slug) {
      same++;
      continue;
    }

    console.log(`${magazine.name}: ${magazine.slug} -> ${next}`);
    changed++;
    if (!apply) continue;

    const put = await fetch(`${base}/api/magazines/${magazine.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ slug: next }),
    });
    if (!put.ok) failed.push(`${magazine.name}：${put.status} ${await put.text()}`);
  }

  console.log(`\n${changed} 本要改、${same} 本不變`);
  for (const line of failed) console.error(`FAILED ${line}`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
