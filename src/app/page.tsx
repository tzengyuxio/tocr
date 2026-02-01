import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, Search, Tags, Gamepad2 } from "lucide-react";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <BookOpen className="h-6 w-6" />
            TOCR 期刊目錄索引
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/magazines"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              期刊
            </Link>
            <Link
              href="/articles"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              文章
            </Link>
            <Link
              href="/games"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              遊戲
            </Link>
            <Link
              href="/tags"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              標籤
            </Link>
            {session?.user ? (
              <>
                {["EDITOR", "ADMIN"].includes(session.user.role) && (
                  <Button asChild size="sm">
                    <Link href="/admin">後台管理</Link>
                  </Button>
                )}
              </>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/signin">登入</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          遊戲雜誌目錄索引
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          探索經典遊戲雜誌的完整目錄，搜尋特定遊戲、人物或主題的相關文章，重溫遊戲媒體的黃金年代。
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/magazines">
              <BookOpen className="mr-2 h-5 w-5" />
              瀏覽期刊
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/search">
              <Search className="mr-2 h-5 w-5" />
              搜尋文章
            </Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          <Card>
            <CardHeader>
              <BookOpen className="h-10 w-10 text-primary" />
              <CardTitle className="mt-4">期刊目錄</CardTitle>
              <CardDescription>
                完整收錄多本經典遊戲雜誌的目錄資料，包含每期封面、出版日期、文章列表等詳細資訊。
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Gamepad2 className="h-10 w-10 text-primary" />
              <CardTitle className="mt-4">遊戲索引</CardTitle>
              <CardDescription>
                透過遊戲名稱快速找到所有相關報導，追蹤特定遊戲在媒體上的完整歷史紀錄。
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Tags className="h-10 w-10 text-primary" />
              <CardTitle className="mt-4">主題標籤</CardTitle>
              <CardDescription>
                依照人物、活動、遊戲系列等標籤分類，輕鬆探索特定主題的所有相關文章。
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              TOCR 期刊目錄索引系統
            </p>
            <p className="text-sm text-muted-foreground">
              Built with Next.js & Tailwind CSS
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
