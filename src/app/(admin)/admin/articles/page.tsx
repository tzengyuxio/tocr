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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, FileText, Loader2, Pencil, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

interface Article {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  category: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  sortOrder: number;
  issue: {
    id: string;
    issueNumber: string;
    publishDate: string;
    magazine: {
      id: string;
      name: string;
    };
  };
}

interface Magazine {
  id: string;
  name: string;
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMagazine, setSelectedMagazine] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchMagazines = useCallback(async () => {
    try {
      const response = await fetch("/api/magazines?limit=100");
      if (response.ok) {
        const data = await response.json();
        setMagazines(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch magazines:", error);
    }
  }, []);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (selectedMagazine) params.set("magazineId", selectedMagazine);

      const response = await fetch(`/api/articles?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setArticles(data.data || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedMagazine]);

  useEffect(() => {
    fetchMagazines();
  }, [fetchMagazines]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchArticles();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">文章管理</h1>
        <p className="text-muted-foreground">瀏覽與編輯所有文章</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>文章列表</CardTitle>
          <CardDescription>共 {total} 篇文章</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 搜尋與篩選 */}
          <form onSubmit={handleSearch} className="mb-6 flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜尋文章標題..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedMagazine || "all"}
              onValueChange={(value) => {
                setSelectedMagazine(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="所有期刊" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有期刊</SelectItem>
                {magazines.map((mag) => (
                  <SelectItem key={mag.id} value={mag.id}>
                    {mag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit">搜尋</Button>
          </form>

          {/* 文章列表 */}
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-16 w-16 text-muted-foreground/50" />
              <h2 className="mt-4 text-xl font-semibold">
                {search || selectedMagazine ? "找不到符合的文章" : "尚無文章"}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {search || selectedMagazine
                  ? "請嘗試其他搜尋條件"
                  : "透過 OCR 辨識或手動新增文章"}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>標題</TableHead>
                    <TableHead>期刊 / 單期</TableHead>
                    <TableHead>分類</TableHead>
                    <TableHead>頁碼</TableHead>
                    <TableHead>作者</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{article.title}</div>
                          {article.subtitle && (
                            <div className="text-sm text-muted-foreground">
                              {article.subtitle}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <BookOpen className="h-3 w-3" />
                          <Link
                            href={`/admin/magazines/${article.issue.magazine.id}`}
                            className="hover:underline"
                          >
                            {article.issue.magazine.name}
                          </Link>
                          <span className="text-muted-foreground">/</span>
                          <Link
                            href={`/admin/magazines/${article.issue.magazine.id}/issues/${article.issue.id}`}
                            className="hover:underline"
                          >
                            {article.issue.issueNumber}
                          </Link>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(article.issue.publishDate), "yyyy/MM/dd", {
                            locale: zhTW,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {article.category && (
                          <Badge variant="outline">{article.category}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {article.pageStart
                          ? `p.${article.pageStart}${
                              article.pageEnd && article.pageEnd !== article.pageStart
                                ? `-${article.pageEnd}`
                                : ""
                            }`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[150px] truncate text-sm text-muted-foreground">
                          {article.authors.length > 0
                            ? article.authors.join(", ")
                            : "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/articles/${article.id}`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            編輯
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分頁 */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    上一頁
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    下一頁
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
