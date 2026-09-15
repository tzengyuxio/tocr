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
