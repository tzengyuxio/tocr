"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gamepad2, Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface Game {
  id: string;
  name: string;
  nameOriginal: string | null;
  nameEn: string | null;
  platforms: string[];
  coverImage: string | null;
  _count: {
    articleGames: number;
  };
}

const PAGE_SIZE = 20;

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchGames = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }
      const res = await fetch(`/api/games?${params}`);
      const data = await res.json();
      setGames(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      console.error("Failed to fetch games:", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">遊戲索引</h1>
        <p className="mt-2 text-muted-foreground">
          透過遊戲名稱找到所有相關報導
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜尋遊戲..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : games.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Gamepad2 className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-xl font-semibold">
            {debouncedSearch ? "找不到符合的遊戲" : "尚無遊戲資料"}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {debouncedSearch ? "請嘗試其他關鍵字" : "資料建置中，敬請期待"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {games.map((game) => (
              <Link key={game.id} href={`/games/${game.id}`}>
                <Card className="h-full transition-shadow hover:shadow-lg">
                  <CardHeader className="pb-3">
                    {game.coverImage ? (
                      <img
                        src={game.coverImage}
                        alt={game.name}
                        className="mb-3 aspect-square w-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="mb-3 flex aspect-square items-center justify-center rounded-lg bg-muted">
                        <Gamepad2 className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                    <CardTitle className="line-clamp-1">{game.name}</CardTitle>
                    {(game.nameOriginal || game.nameEn) && (
                      <CardDescription className="line-clamp-1">
                        {game.nameOriginal || game.nameEn}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {game.platforms.slice(0, 3).map((p) => (
                        <Badge key={p} variant="outline" className="text-xs">
                          {p}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {game._count.articleGames} 篇相關文章
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                上一頁
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {page} / {totalPages} 頁（共 {total} 款遊戲）
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一頁
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
