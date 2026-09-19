/**
 * 站外連結指向哪個站。
 *
 * 值寫成字面量而不從 `@prisma/client` 匯入，與 MAGAZINE_CATEGORY_VALUES 同一個
 * 做法：這份表要被 client component（LinkSection）讀到，而 Prisma 不能跟進
 * 瀏覽器。schema 的 enum ExternalSite 是同一組值，兩邊一起改。
 */
export const EXTERNAL_SITE_VALUES = [
  "INTERNET_ARCHIVE",
  "NOSTALIBRARY",
  "CDOSGAME",
  "NCL",
  "WIKIPEDIA",
  "OTHER",
] as const;

export type ExternalSite = (typeof EXTERNAL_SITE_VALUES)[number];

/**
 * 站點的顯示名稱。編輯選站點、不打字，同一個站因此不會被寫成五種寫法——
 * 這正是不用自由文字當類型的理由。
 */
export const EXTERNAL_SITE_LABELS: Record<ExternalSite, string> = {
  INTERNET_ARCHIVE: "Internet Archive",
  NOSTALIBRARY: "懷舊圖書館",
  CDOSGAME: "中文 DOS 遊戲資料庫",
  NCL: "國家圖書館",
  WIKIPEDIA: "維基百科",
  OTHER: "其他",
};

/**
 * 這條連結在畫面上叫什麼。
 *
 * OTHER 用編輯自己填的名字；填了名字的其他站點也尊重它（同一個站可能有兩條
 * 連結，例如 IA 的全本掃描與縮圖集，光寫「Internet Archive」分不出來）。
 */
export function externalLinkLabel(link: {
  site: ExternalSite;
  label: string | null;
}): string {
  return link.label?.trim() || EXTERNAL_SITE_LABELS[link.site];
}

/**
 * 這條連結在那個站上的條目叫什麼。沒得說時回 `null`。
 *
 * 光寫站名，一整排連結會讀成「維基百科」「維基百科」「維基百科」——說得出是
 * 哪個站，說不出點進去會看到什麼。所以畫面上站名與條目名一起列。
 *
 * 來源有兩個。優先是編輯填的 `label`；沒有的話，**網址裡讀得出條目名的站點就從
 * 網址取**：維基百科的路徑最後一段就是條目名（`/wiki/Monkey_Island_2:_LeChuck's_Revenge`），
 * 底線還原成空格、百分比編碼解開即可。這是站上 602 條維基連結唯一的來路——它們是
 * 整批建的，沒有人一條一條填過名字。
 *
 * **中文 DOS 遊戲資料庫取不到**：它的網址是流水號（`/games/cdg-0030`），條目名不在
 * 裡面，只能等 `label` 被回填。Internet Archive 的 identifier 同理，雖然半可讀，
 * 但那是檔案代號不是條目名，寧可不顯示也不要拿代號充數。
 */
export function externalLinkEntryName(link: {
  site: ExternalSite;
  url: string;
  label: string | null;
}): string | null {
  const label = link.label?.trim();
  if (label) return label;
  if (link.site !== "WIKIPEDIA") return null;
  return wikipediaTitle(link.url);
}

function wikipediaTitle(url: string): string | null {
  const path = url.split("#")[0].split("?")[0];
  const segment = path.split("/wiki/")[1];
  if (!segment) return null;
  try {
    const title = decodeURIComponent(segment).replace(/_/g, " ").trim();
    return title || null;
  } catch {
    // 壞掉的百分比編碼：寧可只顯示站名，也不要讓一條連結弄壞整頁。
    return null;
  }
}
