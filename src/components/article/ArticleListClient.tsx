"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, FileText, ListPlus } from "lucide-react";
import { BatchArticleForm } from "./BatchArticleForm";

interface ArticleItem {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  category: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  articleGames: Array<{
    game: { id: string; name: string };
  }>;
}

interface ArticleListClientProps {
  articles: ArticleItem[];
  issueId: string;
  magazineId: string;
}

export function ArticleListClient({
  articles,
  issueId,
}: ArticleListClientProps) {
  const [showBatchForm, setShowBatchForm] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>文章列表</CardTitle>
          <CardDescription>共 {articles.length} 篇文章</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowBatchForm((v) => !v)}
          >
            <ListPlus className="mr-2 h-4 w-4" />
            {showBatchForm ? "收起" : "批次新增"}
          </Button>
          <Button asChild variant="outline">
            <Link href={`/admin/articles/new?issueId=${issueId}`}>
              <Plus className="mr-2 h-4 w-4" />
              手動新增
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {articles.length === 0 && !showBatchForm ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">尚無文章資料</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              使用 AI 辨識功能自動產生，或手動新增文章
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">頁碼</TableHead>
                <TableHead>標題</TableHead>
                <TableHead>作者</TableHead>
                <TableHead>分類</TableHead>
                <TableHead>相關遊戲</TableHead>
                <TableHead className="w-[80px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell className="font-mono text-sm">
                    {article.pageStart}
                    {article.pageEnd &&
                    article.pageEnd !== article.pageStart
                      ? `-${article.pageEnd}`
                      : ""}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{article.title}</div>
                    {article.subtitle && (
                      <div className="text-sm text-muted-foreground">
                        {article.subtitle}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {article.authors.length > 0
                      ? article.authors.join(", ")
                      : "-"}
                  </TableCell>
                  <TableCell>{article.category || "-"}</TableCell>
                  <TableCell>
                    {article.articleGames.length > 0
                      ? article.articleGames
                          .map((ag) => ag.game.name)
                          .join(", ")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/admin/articles/${article.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {showBatchForm && (
          <BatchArticleForm
            issueId={issueId}
            onDone={() => setShowBatchForm(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}
