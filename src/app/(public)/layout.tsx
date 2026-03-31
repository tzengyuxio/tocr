import Link from "next/link";
import { BookOpen, Gamepad2, Tags, Search, Home, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/MobileNav";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center px-4">
          <MobileNav />
          <Link href="/" className="mr-6 flex items-center space-x-2 group">
            <BookOpen className="h-6 w-6 text-primary transition-transform group-hover:scale-110" />
            <span className="font-bold text-lg tracking-tight">TOCR</span>
          </Link>
          <nav className="hidden flex-1 items-center space-x-1 sm:flex">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <Home className="mr-1.5 h-4 w-4" />
                首頁
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/magazines">
                <BookOpen className="mr-1.5 h-4 w-4" />
                期刊
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/games">
                <Gamepad2 className="mr-1.5 h-4 w-4" />
                遊戲
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tags">
                <Tags className="mr-1.5 h-4 w-4" />
                標籤
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/contributors">
                <Award className="mr-1.5 h-4 w-4" />
                貢獻者
              </Link>
            </Button>
          </nav>
          <div className="ml-auto flex items-center space-x-2">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
              <Link href="/search">
                <Search className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-1.5">搜尋</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/admin">後台管理</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-3.5rem-4rem)]">{children}</main>

      {/* Footer */}
      <footer className="border-t py-6 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>TOCR — 遊戲雜誌目錄索引系統</p>
          <p className="mt-1 text-xs">
            AI 輔助辨識 · 社群協作編輯 · 開放資料
          </p>
        </div>
      </footer>
    </div>
  );
}
