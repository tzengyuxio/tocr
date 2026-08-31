/**
 * 「校」——公開頁上的那一枚小印。
 *
 * 一個字而不是「已校訂」三個字：紅底白字的方框太顯眼，長度一長就從標記變成
 * 標題旁的第二個重點。單字加方框在形狀上就是藏書印，跟這個站的題材對得上。
 *
 * 選「校」不選「閱」：`Issue.completeAt` 的語意是**對資料的陳述**，不是對某個人
 * 審閱動作的紀錄，「閱」會跟資料模型講反話。也不選「勘」——單獨出現多半被讀成
 * 勘查，「校勘」的語感要兩個字才立得住。
 *
 * 二態，不是後台那三態：核對過就標，其餘一律不標。「完備・已變更」是內部待辦，
 * 讀者看到只會困惑；沒有標記也不需要解釋——沒標不代表有錯。三態的那一個在
 * components/magazine/CompleteBadge.tsx，只給後台用。
 */
export function VerifiedMark({ verified }: { verified: boolean }) {
  if (!verified) return null;

  return (
    <span
      // 楷體讓它讀起來像印章而不像警示標籤。字型堆疊寫在這裡而不進 globals.css：
      // 全站只有這一枚印用得到，放進主題等於宣稱它是通用的排版選擇。
      style={{
        fontFamily: '"Kaiti TC", "Kaiti SC", STKaiti, BiauKai, "DFKai-SB", serif',
      }}
      className="inline-flex h-[1.35em] w-[1.35em] shrink-0 select-none items-center justify-center bg-red-600 text-[0.85em] leading-none text-white"
      title="這一期的資料經管理員核對過"
      aria-label="資料已校訂"
    >
      校
    </span>
  );
}
