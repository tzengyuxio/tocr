import type { Metadata } from "next";

/**
 * Open Graph 的共用組裝。
 *
 * 沒有這些標籤時，任何一頁貼到 LINE／Threads／Discord 都只是一段光禿禿的網址。
 *
 * **為什麼每一頁都要自己給 `images`**：Next.js 的 metadata 是淺層合併，子頁一旦
 * 宣告 `openGraph`，父層的 `openGraph.images` 就整個不見了，不會補回來。與其記住
 * 這條規則，不如讓每一頁都經過這裡。
 */

/** 站台預設圖，1200×630。沒有自己的圖時一律用它。 */
export const DEFAULT_OG_IMAGE = {
  url: "/og-default.png",
  width: 1200,
  height: 630,
};

/**
 * 這一頁要用的圖。
 *
 * 有自己的圖就用自己的——單期用封面、期刊用刊頭。那些是直式的，抓取端會排成小張
 * 縮圖而不是大橫幅，但「看得到那本雜誌長什麼樣」比「圖填滿整張卡」有用。
 */
export function ogImages(url?: string | null) {
  return url ? [{ url }] : [DEFAULT_OG_IMAGE];
}

/** 逐頁的 OG 區塊：標題、描述、圖，其餘（site_name、locale）繼承根 layout。 */
export function pageOpenGraph({
  title,
  description,
  image,
}: {
  title: string;
  description?: string | null;
  image?: string | null;
}): Metadata["openGraph"] {
  return {
    title,
    ...(description ? { description } : {}),
    images: ogImages(image),
  };
}
