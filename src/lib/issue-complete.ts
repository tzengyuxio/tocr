import { prisma } from "./prisma";

/**
 * 「完備」是管理員對一期資料下的判斷：該有的都有了，不必再回頭看。
 *
 * 它是三態，而三態只用兩個時間欄位表達：
 *
 *   completeAt 為 null                      —— 沒有標示過
 *   completeAt 有值、completeStaleAt 為 null —— 完備
 *   兩者皆有值                                —— 完備後有變更
 *
 * 沒有拿 `updatedAt` 去跟 `completeAt` 比，是因為設定完備這個動作本身就會更新
 * `updatedAt`，比對結果永遠是「已變更」。
 */

/**
 * 不算「資料被動過」的欄位。
 *
 * 這三個記的是狀態而不是這一期的內容：完備標記自己顯然不該讓自己失效，而目錄
 * 複查跟完備一樣是人對資料下的判斷，不是資料。
 */
const STAMP_FIELDS = new Set(["completeAt", "completeStaleAt", "tocReviewedAt"]);

/** 這次寫入有沒有動到資料本身（`diffChanges()` 的結果）。 */
export function touchesData(changes: Record<string, unknown>): boolean {
  return Object.keys(changes).some((field) => !STAMP_FIELDS.has(field));
}

/**
 * 完備之後第一次被改動，就在這一期留下時間。
 *
 * 條件寫在 `where` 裡，所以重複呼叫是安全的：沒標過完備的不受影響，已經標成
 * 有變更的也不會把時間往後推——要的是「什麼時候開始不作數」，不是最後一次改動。
 */
export async function markIssueChanged(issueId: string): Promise<void> {
  await prisma.issue.updateMany({
    where: { id: issueId, completeAt: { not: null }, completeStaleAt: null },
    data: { completeStaleAt: new Date() },
  });
}
