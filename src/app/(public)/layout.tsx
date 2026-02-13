import Link from "next/link";
import { BookOpen, Gamepad2, Tags, Search, Home } from "lucide-react";
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
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <BookOpen className="h-6 w-6" />
            <span className="font-bold">TOCR</span>
          </Link>
          <nav className="hidden flex-1 items-center space-x-1 sm:flex">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                首頁
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/magazines">
                <BookOpen className="mr-2 h-4 w-4" />
                期刊
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/games">
                <Gamepad2 className="mr-2 h-4 w-4" />
                遊戲
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tags">
                <Tags className="mr-2 h-4 w-4" />
                標籤
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/search">
                <Search className="mr-2 h-4 w-4" />
                搜尋
              </Link>
            </Button>
          </nav>
          <div className="ml-auto flex items-center space-x-2">
            <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/admin">後台管理</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-3.5rem-4rem)]">{children}</main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>TOCR - 期刊目錄索引系統</p>
        </div>
      </footer>
    </div>
  );
}
