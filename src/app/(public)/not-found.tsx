import { NotFoundNotice } from "@/components/NotFoundNotice";
import { publicContents } from "@/lib/not-found-contents";

/**
 * 公開頁的 `notFound()` 落點：期刊、單期、遊戲、標籤找不到時都到這裡。
 *
 * 與根目錄那份的差別只有外框——這一份長在 `(public)/layout.tsx` 底下，頁首頁尾
 * 都在，所以不必自己再擺一條標題列。目錄本身就是出口，兩份共用同一張。
 */
export const metadata = { title: "找不到頁面" };

export default function PublicNotFound() {
  return (
    <NotFoundNotice
      title="找不到這個頁面"
      description="這本雜誌、這一期、或這個條目可能不存在，也可能網址打錯了。目錄上有的都還在。"
      entries={publicContents}
    />
  );
}
