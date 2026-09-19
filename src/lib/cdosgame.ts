/**
 * 從 cdosgame 取用資料的規則。
 *
 * cdosgame（中文 DOS 遊戲資料庫）跟這個站是同一個人的，所以取用沒有版權顧慮，
 * 但**它只收單機 PC 遊戲**——線上遊戲與家用主機都不在裡面，站上文章數最高的
 * 那批（三國演義ONLINE、莎木、仙境傳說）一個都查不到。能靠它補的是 DOS／Windows
 * 那條軸線。
 */

/**
 * genre 代號 → 中文名，**逐個查過 cdosgame 的 /genres/<代號> 頁面**，不是照字面推的。
 *
 * 推會錯，而且錯得不明顯：`TBG` 是棋牌桌遊不是回合制、`LSG` 是養成不是戀愛模擬、
 * `AVG` 是視覺小說不是冒險、`CBG` 是城市建造不是卡牌對戰。站上既有的 `genres`
 * 用中文（「射擊」「策略」），所以存中文名而不是代號。
 */
export const CDOSGAME_GENRES: Record<string, string> = {
  RPG: "角色扮演",
  TBG: "棋牌桌遊",
  ACT: "動作",
  SLG: "回合策略",
  SRPG: "戰棋角色扮演",
  ADV: "冒險",
  SIM: "模擬",
  LSG: "養成",
  PZG: "益智解謎",
  AVG: "視覺小說",
  SPG: "運動",
  ARPG: "動作角色扮演",
  STG: "射擊",
  RTS: "即時戰略",
  AADV: "動作冒險",
  HSG: "歷史模擬",
  RCG: "賽車",
  CMS: "經營管理",
  ETC: "其他",
  FTG: "格鬥",
  CBG: "城市建造",
  FPS: "第一人稱射擊",
};

/**
 * 照 data-conventions 的「遊戲封面」優先序：盒裝 > 宣傳 > 標題畫面。
 *
 * 白名單而不是黑名單——**認不得的檔名一律不用**。同一條規矩說「遊戲內截圖與美術
 * 設定圖不算封面」，而取樣二十個條目只看到這四種檔名，不代表沒有第五種；
 * 「找不到就拿第一張」會在遇到它的那天安靜地把截圖擺到遊戲頁頂端。
 */
const COVER_PRIORITY = ["box-front", "key-visual", "ad", "title"] as const;

const MEDIA_SRC = /src="(\/media\/games\/[^"]+\.(?:webp|jpg|png))"/g;

/**
 * 從條目頁面挑一張當封面，挑不到就回 null。
 *
 * 縮圖（`/thumb/`）不要——遊戲頁的封面是 144×192，縮圖會糊。
 *
 * 回傳完整網址。圖留在 cdosgame 上不轉存：兩站同屬一人，複製一份只是讓同一張圖
 * 有兩個要同步的地方，而前台渲染遊戲封面帶 `unoptimized`、不走 `/_next/image`，
 * 所以 `remotePatterns` 也擋不到它（RAWG 那條 2026-08-22 實測過）。
 */
export function pickCover(html: string, base: string): string | null {
  const paths = [...html.matchAll(MEDIA_SRC)]
    .map((m) => m[1])
    .filter((p) => !p.includes("/thumb/"));

  for (const kind of COVER_PRIORITY) {
    // 序號可有可無：box-front.webp 與 box-front-01.webp 都出現過。
    const matching = paths
      .filter((p) => new RegExp(`/${kind}(-\\d+)?\\.\\w+$`).test(p))
      .sort();
    if (matching.length > 0) return new URL(matching[0], base).toString();
  }

  return null;
}

/** cdosgame 的一筆條目，取用得到的欄位。 */
export interface CdosEntry {
  id: string;
  developer?: string;
  publisher_tw?: string[];
  genre?: string;
}

/**
 * 這筆條目能補上站上哪些欄位。
 *
 * **只填空的**，與合併時的規則一致：站上的值是編輯選的，上游的是參考。
 * `publisher_tw` 是台灣代理商——對一個台灣雜誌索引來說，那正是讀者認得的
 * 「發行商」（第三波、智冠），不是日本原廠。
 */
export function enrichment(
  current: { developer: string | null; publisher: string | null; genres: string[] },
  entry: CdosEntry,
  cover: string | null,
  currentCover: string | null
): { developer?: string; publisher?: string; genres?: string[]; coverImage?: string } {
  const patch: { developer?: string; publisher?: string; genres?: string[]; coverImage?: string } = {};

  if (!current.developer && entry.developer) patch.developer = entry.developer;
  if (!current.publisher && entry.publisher_tw?.length) {
    patch.publisher = entry.publisher_tw.join("、");
  }
  if (current.genres.length === 0 && entry.genre) {
    const label = CDOSGAME_GENRES[entry.genre];
    if (label) patch.genres = [label];
  }
  if (!currentCover && cover) patch.coverImage = cover;

  return patch;
}

const WIKIPEDIA_HREF = /href="(https:\/\/[a-z-]+\.wikipedia\.org\/[^"]+)"/g;

/**
 * 條目頁上的維基百科連結，沒有就是 null。
 *
 * cdosgame 自己在「外部連結」那區列了維基條目（也列攻略本、介紹頁），所以抓一次
 * 頁面能同時拿到封面與維基網址，不必另外查一輪維基。**不是每個條目都有**——
 * 《仙劍奇俠傳》就沒有，那就不建那條連結，不去猜網址。
 *
 * 只取第一個：條目頁通常只列一條，**語言版本由上游決定**——《三國志III》連的是
 * 中文版，《快打旋風》《光芒之池》連的是英文版，因為那些遊戲沒有中文條目。
 * 不去把英文條目換成猜出來的中文網址。
 */
export function pickWikipedia(html: string): string | null {
  const first = [...html.matchAll(WIKIPEDIA_HREF)][0];
  return first ? decodeURI(first[1]) : null;
}
