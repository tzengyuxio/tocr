"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  ExternalLink,
  Trash2,
  Loader2,
} from "lucide-react";

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

interface ArticleUpdatePayload {
  title: string;
  subtitle: string | null;
  category: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  authors: string[];
}

interface EditableArticleRowProps {
  article: ArticleItem;
  isEditing: boolean;
  onStartEdit: () => void;
  onSaveEdit: (data: ArticleUpdatePayload) => Promise<void>;
  onCancelEdit: () => void;
  onDelete: () => void;
}

export type { ArticleItem, ArticleUpdatePayload };

export function EditableArticleRow({
  article,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: EditableArticleRowProps) {
  const [formData, setFormData] = useState<ArticleUpdatePayload>({
    title: article.title,
    subtitle: article.subtitle,
    category: article.category,
    pageStart: article.pageStart,
    pageEnd: article.pageEnd,
    authors: article.authors,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [authorsText, setAuthorsText] = useState(article.authors.join(", "));

  const handleStartEdit = () => {
    setFormData({
      title: article.title,
      subtitle: article.subtitle,
      category: article.category,
      pageStart: article.pageStart,
      pageEnd: article.pageEnd,
      authors: article.authors,
    });
    setAuthorsText(article.authors.join(", "));
    onStartEdit();
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    setIsSaving(true);
    try {
      const authors = authorsText
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      await onSaveEdit({ ...formData, authors });
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancelEdit();
    }
  };

  const pageDisplay = article.pageStart
    ? article.pageEnd && article.pageEnd !== article.pageStart
      ? `${article.pageStart}-${article.pageEnd}`
      : `${article.pageStart}`
    : null;

  if (isEditing) {
    return (
      <div className="rounded-lg border-2 border-primary/30 bg-muted/30 p-4 space-y-3">
        {/* Row 1: title + subtitle */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">標題 *</Label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              autoFocus
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">副標題</Label>
            <Input
              value={formData.subtitle || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  subtitle: e.target.value || null,
                })
              }
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        {/* Row 2: pageStart + pageEnd + category + authors */}
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">起始頁碼</Label>
            <Input
              type="number"
              value={formData.pageStart ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  pageStart: e.target.value ? Number(e.target.value) : null,
                })
              }
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">結束頁碼</Label>
            <Input
              type="number"
              value={formData.pageEnd ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  pageEnd: e.target.value ? Number(e.target.value) : null,
                })
              }
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">分類</Label>
            <Input
              value={formData.category || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value || null,
                })
              }
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">作者（逗號分隔）</Label>
            <Input
              value={authorsText}
              onChange={(e) => setAuthorsText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        {/* Games display (read-only, edit in full page) */}
        {article.articleGames.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">相關遊戲：</span>
            <div className="flex flex-wrap gap-1">
              {article.articleGames.map((ag) => (
                <Badge key={ag.game.id} variant="secondary" className="text-xs">
                  {ag.game.name}
                </Badge>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              （至進階編輯頁修改）
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            刪除
          </Button>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/admin/articles/${article.id}`}>
                <ExternalLink className="mr-1 h-3 w-3" />
                進階編輯
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelEdit}
              disabled={isSaving}
            >
              <X className="mr-1 h-3 w-3" />
              取消
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Check className="mr-1 h-3 w-3" />
              )}
              儲存
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Read mode
  return (
    <div
      className="group flex items-center gap-3 rounded-lg border px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={handleStartEdit}
    >
      {/* Page number */}
      {pageDisplay && (
        <span className="shrink-0 font-mono text-sm text-muted-foreground w-12 text-right">
          p.{pageDisplay}
        </span>
      )}

      {/* Title + subtitle + badges */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{article.title}</span>
          {article.subtitle && (
            <span className="text-sm text-muted-foreground truncate hidden sm:inline">
              {article.subtitle}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {article.category && (
            <Badge variant="outline" className="text-xs">
              {article.category}
            </Badge>
          )}
          {article.authors.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {article.authors.join(", ")}
            </Badge>
          )}
          {article.articleGames.map((ag) => (
            <Badge key={ag.game.id} variant="secondary" className="text-xs">
              {ag.game.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Action buttons (visible on hover) */}
      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => e.stopPropagation()}
        >
          <Link href={`/admin/articles/${article.id}`}>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
