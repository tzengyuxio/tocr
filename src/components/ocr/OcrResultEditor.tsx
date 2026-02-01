"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trash2,
  Edit,
  Plus,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import type { OcrArticleResult, OcrResult } from "@/services/ai/ocr.interface";

interface OcrResultEditorProps {
  result: OcrResult;
  issueId: string;
  onSave: (articles: OcrArticleResult[]) => Promise<void>;
  onCancel: () => void;
}

export function OcrResultEditor({
  result,
  issueId,
  onSave,
  onCancel,
}: OcrResultEditorProps) {
  const [articles, setArticles] = useState<OcrArticleResult[]>(result.articles);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingArticle, setEditingArticle] = useState<OcrArticleResult | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditingArticle({ ...articles[index] });
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editingArticle) {
      const newArticles = [...articles];
      newArticles[editingIndex] = editingArticle;
      setArticles(newArticles);
      setEditingIndex(null);
      setEditingArticle(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingArticle(null);
  };

  const handleDelete = (index: number) => {
    setArticles(articles.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    const newArticle: OcrArticleResult = {
      title: "",
      authors: [],
      confidence: 1,
    };
    setArticles([...articles, newArticle]);
    setEditingIndex(articles.length);
    setEditingArticle(newArticle);
  };

  const handleSaveAll = async () => {
    // 驗證必填欄位
    const invalidArticles = articles.filter((a) => !a.title.trim());
    if (invalidArticles.length > 0) {
      setError("所有文章都必須有標題");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(articles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setIsSaving(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "bg-green-100 text-green-800";
    if (confidence >= 0.7) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                辨識結果
              </CardTitle>
              <CardDescription>
                共辨識出 {articles.length} 篇文章，處理時間{" "}
                {(result.processingTime / 1000).toFixed(2)} 秒
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                新增文章
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-4 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {result.metadata && (
            <div className="rounded-lg bg-muted p-4">
              <h4 className="mb-2 font-medium">辨識資訊</h4>
              <div className="grid gap-2 text-sm md:grid-cols-3">
                {result.metadata.issueTitle && (
                  <div>
                    <span className="text-muted-foreground">特輯標題：</span>
                    {result.metadata.issueTitle}
                  </div>
                )}
                {result.metadata.publishDate && (
                  <div>
                    <span className="text-muted-foreground">出版日期：</span>
                    {result.metadata.publishDate}
                  </div>
                )}
                {result.metadata.pageInfo && (
                  <div>
                    <span className="text-muted-foreground">頁面資訊：</span>
                    {result.metadata.pageInfo}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">頁碼</TableHead>
                  <TableHead>標題</TableHead>
                  <TableHead>作者</TableHead>
                  <TableHead>分類</TableHead>
                  <TableHead>相關遊戲</TableHead>
                  <TableHead className="w-[80px]">信心度</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">
                      {article.pageStart}
                      {article.pageEnd && article.pageEnd !== article.pageStart
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
                      {article.authors && article.authors.length > 0
                        ? article.authors.join(", ")
                        : "-"}
                    </TableCell>
                    <TableCell>{article.category || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {article.suggestedGames?.map((game, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {game}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={getConfidenceColor(article.confidence)}
                      >
                        {Math.round(article.confidence * 100)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(index)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>
              取消
            </Button>
            <Button onClick={handleSaveAll} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  儲存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  儲存全部文章
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 編輯對話框 */}
      <Dialog
        open={editingIndex !== null}
        onOpenChange={(open) => !open && handleCancelEdit()}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>編輯文章</DialogTitle>
            <DialogDescription>修改辨識結果中的文章資訊</DialogDescription>
          </DialogHeader>

          {editingArticle && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>標題 *</Label>
                  <Input
                    value={editingArticle.title}
                    onChange={(e) =>
                      setEditingArticle({
                        ...editingArticle,
                        title: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>副標題</Label>
                  <Input
                    value={editingArticle.subtitle || ""}
                    onChange={(e) =>
                      setEditingArticle({
                        ...editingArticle,
                        subtitle: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>起始頁碼</Label>
                  <Input
                    type="number"
                    value={editingArticle.pageStart || ""}
                    onChange={(e) =>
                      setEditingArticle({
                        ...editingArticle,
                        pageStart: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>結束頁碼</Label>
                  <Input
                    type="number"
                    value={editingArticle.pageEnd || ""}
                    onChange={(e) =>
                      setEditingArticle({
                        ...editingArticle,
                        pageEnd: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>分類</Label>
                  <Input
                    value={editingArticle.category || ""}
                    onChange={(e) =>
                      setEditingArticle({
                        ...editingArticle,
                        category: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>作者（逗號分隔）</Label>
                <Input
                  value={editingArticle.authors?.join(", ") || ""}
                  onChange={(e) =>
                    setEditingArticle({
                      ...editingArticle,
                      authors: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>相關遊戲（逗號分隔）</Label>
                <Input
                  value={editingArticle.suggestedGames?.join(", ") || ""}
                  onChange={(e) =>
                    setEditingArticle({
                      ...editingArticle,
                      suggestedGames: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>摘要</Label>
                <Textarea
                  value={editingArticle.summary || ""}
                  onChange={(e) =>
                    setEditingArticle({
                      ...editingArticle,
                      summary: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              取消
            </Button>
            <Button onClick={handleSaveEdit}>確認修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
