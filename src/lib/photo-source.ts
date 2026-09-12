/**
 * 額外圖片的出處，公開頁看得到哪一部分。
 *
 * 拍賣與購物網站的出處**只留名字、不連結**：連出去像在替賣場導流，而商品下架
 * 之後那個連結本來也活不久。文章、論壇、部落格這類來源不受影響——那是真的有
 * 東西可讀的出處，連過去對讀者有用。
 *
 * 判斷要在頁面組資料那一步做完，不要留到元件裡：值只要進了 props 就會落在
 * RSC payload，view-source 搜得到、爬蟲也吃得到，等於「點不到」但仍然公開。
 * 同 `Photo.isPublic` 濾在查詢層的理由。網址本身仍存在資料庫，後台照樣查得到。
 */

/** 註冊網域；子網域一併涵蓋（`tw.bid.yahoo.com` 走 `bid.yahoo.com`）。 */
const MARKETPLACE_HOSTS = ["ruten.com.tw", "shopee.tw", "bid.yahoo.com"];

/** 公開頁該用的出處網址：拍賣站回 null，其餘原樣回傳。 */
export function publicSourceUrl(url: string | null): string | null {
  if (!url) return null;
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    // 解析不出主機名就當不能連——寧可少一個連結，不要放出一個判不了的值。
    return null;
  }
  return MARKETPLACE_HOSTS.some(
    (marketplace) => host === marketplace || host.endsWith(`.${marketplace}`)
  )
    ? null
    : url;
}

/** 一批圖片的出處網址一起過濾；欄位形狀不變，呼叫端不必改。 */
export function withPublicSourceUrls<T extends { sourceUrl: string | null }>(
  photos: T[]
): T[] {
  return photos.map((photo) => ({
    ...photo,
    sourceUrl: publicSourceUrl(photo.sourceUrl),
  }));
}
