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
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Trash2,
  Plus,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Check,
  X,
} from "lucide-react";
import type { OcrArticleResult, OcrResult } from "@/services/ai/ocr.interface";

interface OcrResultEditorProps {
  result: OcrResult;
  issueId: string;
  tocImages: string[];
  onSave: (articles: OcrArticleResult[]) => Promise<void>;
  onCancel: () => void;
}

function ArticleRow({
  article,
  index,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  editingArticle,
  onEditChange,
}: {
  article: OcrArticleResult;
  index: number;
  isEditing: boolean;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  editingArticle: OcrArticleResult | null;
  onEditChange: (article: OcrArticleResult) => void;
}) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "bg-green-100 text-green-800";
    if (confidence >= 0.7) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  if (isEditing && editingArticle) {
    return (
      <div className="rounded-lg border-2 border-primary/30 bg-muted/30 p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">標題 *</Label>
            <Input
              value={editingArticle.title}
              onChange={(e) =>
                onEditChange({ ...editingArticle, title: e.target.value })
              }
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") onCancelEdit();
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">副標題</Label>
            <Input
              value={editingArticle.subtitle || ""}
              onChange={(e) =>
                onEditChange({ ...editingArticle, subtitle: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === "Escape") onCancelEdit();
              }}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">起始頁碼</Label>
            <Input
              type="number"
              value={editingArticle.pageStart || ""}
              onChange={(e) =>
                onEditChange({
                  ...editingArticle,
                  pageStart: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              onKeyDown={(e) => {
                if (e.key === "Escape") onCancelEdit();
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">結束頁碼</Label>
            <Input
              type="number"
              value={editingArticle.pageEnd || ""}
              onChange={(e) =>
                onEditChange({
                  ...editingArticle,
                  pageEnd: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              onKeyDown={(e) => {
                if (e.key === "Escape") onCancelEdit();
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">分類</Label>
            <Input
              value={editingArticle.category || ""}
              onChange={(e) =>
                onEditChange({ ...editingArticle, category: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === "Escape") onCancelEdit();
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">作者（逗號分隔）</Label>
            <Input
              value={editingArticle.authors?.join(", ") || ""}
              onChange={(e) =>
                onEditChange({
                  ...editingArticle,
                  authors: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              onKeyDown={(e) => {
                if (e.key === "Escape") onCancelEdit();
              }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">相關遊戲（逗號分隔）</Label>
          <Input
            value={editingArticle.suggestedGames?.join(", ") || ""}
            onChange={(e) =>
              onEditChange({
                ...editingArticle,
                suggestedGames: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            onKeyDown={(e) => {
              if (e.key === "Escape") onCancelEdit();
            }}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">摘要</Label>
          <Textarea
            value={editingArticle.summary || ""}
            onChange={(e) =>
              onEditChange({ ...editingArticle, summary: e.target.value })
            }
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Escape") onCancelEdit();
            }}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancelEdit}>
            <X className="mr-1 h-3 w-3" />
            取消
          </Button>
          <Button size="sm" onClick={onSaveEdit}>
            <Check className="mr-1 h-3 w-3" />
            確認
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group flex items-center gap-3 rounded-lg border px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onStartEdit}
    >
      <div className="w-16 shrink-0 text-center font-mono text-sm text-muted-foreground">
        {article.pageStart}
        {article.pageEnd && article.pageEnd !== article.pageStart
          ? `-${article.pageEnd}`
          : ""}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{article.title || "(untitled)"}</div>
        {article.subtitle && (
          <div className="text-sm text-muted-foreground truncate">
            {article.subtitle}
          </div>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {article.authors && article.authors.length > 0 && (
            <span>{article.authors.join(", ")}</span>
          )}
          {article.category && (
            <Badge variant="outline" className="text-xs">
              {article.category}
            </Badge>
          )}
          {article.suggestedGames?.map((game, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {game}
            </Badge>
          ))}
        </div>
      </div>
      <Badge
        variant="secondary"
        className={`shrink-0 ${getConfidenceColor(article.confidence)}`}
      >
        {Math.round(article.confidence * 100)}%
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        title="刪除"
        className="shrink-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function OcrResultEditor({
  result,
  issueId,
  tocImages,
  onSave,
  onCancel,
}: OcrResultEditorProps) {
  const [articles, setArticles] = useState<OcrArticleResult[]>(result.articles);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingArticle, setEditingArticle] = useState<OcrArticleResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const handleStartEdit = (index: number) => {
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
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingArticle(null);
    }
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

  const hasTocImages = tocImages.length > 0;

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

          {/* Two-column layout: image viewer + article list */}
          <div className="flex gap-6">
            {/* Left: TOC image viewer (sticky) */}
            {hasTocImages && (
              <div className="w-2/5 shrink-0">
                <div className="sticky top-4 space-y-3">
                  <div className="overflow-hidden rounded-lg border bg-muted/30">
                    <img
                      src={tocImages[currentImageIndex]}
                      alt={`目錄頁 ${currentImageIndex + 1}`}
                      className="w-full cursor-pointer object-contain"
                      onClick={() => setIsZoomed(true)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentImageIndex === 0}
                      onClick={() => setCurrentImageIndex((i) => i - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {currentImageIndex + 1} / {tocImages.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentImageIndex === tocImages.length - 1}
                      onClick={() => setCurrentImageIndex((i) => i + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setIsZoomed(true)}
                  >
                    <ZoomIn className="mr-2 h-4 w-4" />
                    放大檢視
                  </Button>
                </div>
              </div>
            )}

            {/* Right: Article list with in-place editing */}
            <div className="min-w-0 flex-1 space-y-2">
              {articles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <p>尚無辨識結果</p>
                </div>
              ) : (
                articles.map((article, index) => (
                  <ArticleRow
                    key={index}
                    article={article}
                    index={index}
                    isEditing={editingIndex === index}
                    onStartEdit={() => handleStartEdit(index)}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onDelete={() => handleDelete(index)}
                    editingArticle={editingIndex === index ? editingArticle : null}
                    onEditChange={setEditingArticle}
                  />
                ))
              )}
            </div>
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

      {/* Zoom dialog */}
      {hasTocImages && (
        <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-2">
            <div className="relative">
              <img
                src={tocImages[currentImageIndex]}
                alt={`目錄頁 ${currentImageIndex + 1}`}
                className="w-full object-contain max-h-[85vh]"
              />
              {tocImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 rounded-full bg-black/60 px-4 py-2 text-white">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
                    disabled={currentImageIndex === 0}
                    onClick={() => setCurrentImageIndex((i) => i - 1)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <span className="text-sm">
                    {currentImageIndex + 1} / {tocImages.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
                    disabled={currentImageIndex === tocImages.length - 1}
                    onClick={() => setCurrentImageIndex((i) => i + 1)}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
