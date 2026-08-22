import Link from "next/link";
import { BookOpen, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotFoundNotice } from "@/components/NotFoundNotice";

/**
 * 公開頁的 `notFound()` 落點：期刊、單期、遊戲、標籤找不到時都到這裡。
 *
 * 與根目錄那份的差別只有外框——這一份長在 `(public)/layout.tsx` 底下，頁首頁尾
 * 都在，所以不必自己再擺一條標題列。出口多給一個「期刊列表」：走到這裡的人多半
 * 是在找某一本刊，而不是剛進站。
 */
export const metadata = { title: "找不到頁面" };

export default function PublicNotFound() {
  return (
    <NotFoundNotice
      title="找不到這個頁面"
      description="這本雜誌、這一期、或這個條目可能不存在，也可能網址打錯了。"
    >
      <Button asChild>
        <Link href="/">
          <Home className="mr-1.5 h-4 w-4" />
          回首頁
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href="/magazines">
          <BookOpen className="mr-1.5 h-4 w-4" />
          雜誌列表
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href="/search">
          <Search className="mr-1.5 h-4 w-4" />
          搜尋
        </Link>
      </Button>
    </NotFoundNotice>
  );
}
