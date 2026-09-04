import Link from "next/link";
import { BookOpen } from "lucide-react";
import { NotFoundNotice } from "@/components/NotFoundNotice";
import { publicContents } from "@/lib/not-found-contents";

/**
 * 網址完全對不上任何一條路由時的 404。
 *
 * 這一份長在 root layout 底下，拿不到 `(public)` 的頁首頁尾——Next.js 的 route
 * group layout 不會套到根目錄的 not-found。所以標題列自己帶一條，不然讀者除了
 * 上一頁之外沒有出路，而那正是這頁要解決的問題。
 *
 * `notFound()` 從公開頁或後台丟出來時走的是各自那一份，不是這裡。
 */
export const metadata = { title: "找不到頁面" };

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <header className="w-full border-b">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link href="/" className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold tracking-tight">TOCR</span>
          </Link>
        </div>
      </header>
      <NotFoundNotice
        title="找不到這個頁面"
        description="網址可能打錯了，或這個頁面已經不在了。目錄上有的都還在。"
        entries={publicContents}
      />
    </div>
  );
}
