import type { TxClient } from "./resolve-relations";

/**
 * 「這個網址代號有沒有人用過」的答案分散在兩張表：現行的在 `Magazine.slug`，
 * 退役的在 `MagazineSlug`。前者有 @unique 會自己擋，後者不會——資料庫層面沒有
 * 跨表的唯一性，所以要在寫入前問一次。
 *
 * 回傳 true 表示這個代號被**別本**雜誌退役過，不能給 `magazineId` 用。自己退役過
 * 的代號可以拿回來（改名改回去是常見的反悔），呼叫端會順手把那筆歷史刪掉。
 */
export async function isRetiredByAnother(
  tx: TxClient,
  slug: string,
  magazineId?: string
): Promise<boolean> {
  const retired = await tx.magazineSlug.findUnique({
    where: { slug },
    select: { magazineId: true },
  });
  return !!retired && retired.magazineId !== magazineId;
}

/**
 * 換代號時的歷史維護：舊的收進 `MagazineSlug`，新的若是自己以前退役過的就放回來。
 *
 * 必須跟 `Magazine.update` 在同一個 transaction 裡——中間斷掉會留下一個沒有轉址
 * 目標的舊代號，或是同時被現行與歷史佔住的代號。
 */
export async function recordSlugChange(
  tx: TxClient,
  magazineId: string,
  oldSlug: string,
  newSlug: string
): Promise<void> {
  // 改回自己用過的名字：那筆歷史的目標就是現在這條網址，留著會讓同一個代號同時
  // 出現在兩張表，轉址查詢也就有了兩個答案。
  await tx.magazineSlug.deleteMany({ where: { slug: newSlug, magazineId } });
  await tx.magazineSlug.create({ data: { magazineId, slug: oldSlug } });
}

/** 給呼叫端組 409 訊息用，措辭與 api-utils 的 P2002 分支一致。 */
export const RETIRED_SLUG_MESSAGE =
  "這個網址代號是別本雜誌用過的舊代號，舊連結還指著那本刊，請換一個";
