"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDown,
  ArrowUp,
  BetweenHorizontalStart,
  Check,
  X,
  ExternalLink,
  Trash2,
  Loader2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  CommaListInput,
  formatStringList,
  parseStringList,
} from "@/components/ui/comma-list-input";
import { ARTICLE_CATEGORIES } from "@/lib/article-categories";
import type { ArticleCategory } from "@/lib/article-categories";
import { formatTagInput, parseTagInput, type TagInput } from "@/lib/tag-input";
import { CategoryChip, GameChip, TagChip } from "@/components/chips";

interface ArticleItem {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  category: ArticleCategory | null;
  pageStart: number | null;
  pageEnd: number | null;
  summary: string | null;
  articleGames: Array<{
    game: { id: string; name: string };
  }>;
  articleTags: Array<{
    tag: { id: string; name: string; type: string };
  }>;
}

interface ArticleUpdatePayload {
  title: string;
  subtitle: string | null;
  category: ArticleCategory | null;
  pageStart: number | null;
  pageEnd: number | null;
  authors: string[];
  summary: string | null;
  // 以名稱送出，後端沒有的會建起來 -- 複查時新遊戲、新標籤是常態。
  games: string[];
  tags: TagInput[];
}

interface EditableArticleRowProps {
  article: ArticleItem;
  isEditing: boolean;
  onStartEdit: () => void;
  onSaveEdit: (data: ArticleUpdatePayload) => Promise<void>;
  onCancelEdit: () => void;
  onDelete: () => void;
  onInsert?: (position: "before" | "after") => void;
  // The drag handle is supplied by the list, which owns the sortable context.
  dragHandle?: React.ReactNode;
}

export type { ArticleItem, ArticleUpdatePayload };

export function EditableArticleRow({
  article,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onInsert,
  dragHandle,
}: EditableArticleRowProps) {
  const gameNames = () => article.articleGames.map((ag) => ag.game.name);
  const tagInputs = () =>
    article.articleTags.map((at) => ({ name: at.tag.name, type: at.tag.type }));

  const [formData, setFormData] = useState({
    title: article.title,
    subtitle: article.subtitle,
    category: article.category,
    pageStart: article.pageStart,
    pageEnd: article.pageEnd,
    authors: article.authors,
    summary: article.summary,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [authorsDraft, setAuthorsDraft] = useState(article.authors);
  const [gamesDraft, setGamesDraft] = useState<string[]>(gameNames);
  const [tagsDraft, setTagsDraft] = useState<TagInput[]>(tagInputs);

  const handleStartEdit = () => {
    setFormData({
      title: article.title,
      subtitle: article.subtitle,
      category: article.category,
      pageStart: article.pageStart,
      pageEnd: article.pageEnd,
      authors: article.authors,
      summary: article.summary,
    });
    setAuthorsDraft(article.authors);
    setGamesDraft(gameNames());
    setTagsDraft(tagInputs());
    onStartEdit();
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    setIsSaving(true);
    try {
      await onSaveEdit({
        ...formData,
        authors: authorsDraft,
        games: gamesDraft,
        tags: tagsDraft,
      });
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
            <select
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-1 focus-visible:outline-none"
              value={formData.category ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: (e.target.value as ArticleCategory) || null,
                })
              }
              onKeyDown={handleKeyDown}
            >
              <option value="">未分類</option>
              {ARTICLE_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">作者（逗號分隔）</Label>
            <CommaListInput
              value={authorsDraft}
              format={formatStringList}
              parse={parseStringList}
              onChange={setAuthorsDraft}
              onEscape={onCancelEdit}
            />
          </div>
        </div>

        {/* Row 3: games + tags, typed as names rather than picked by id --
            reviewing a scan is continuous typing, and most of these do not
            exist in the database yet. */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">相關遊戲（逗號分隔）</Label>
            <CommaListInput
              value={gamesDraft}
              format={formatStringList}
              parse={parseStringList}
              onChange={setGamesDraft}
              onEscape={onCancelEdit}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              標籤（逗號分隔，格式：名稱 或 類型:名稱）
            </Label>
            <CommaListInput
              value={tagsDraft}
              format={formatTagInput}
              parse={parseTagInput}
              onChange={setTagsDraft}
              onEscape={onCancelEdit}
            />
            {tagsDraft.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {tagsDraft.map((tag, i) => (
                  <TagChip key={i} tag={tag} withTypeLabel className="text-xs" />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 4: summary */}
        <div className="space-y-1">
          <Label className="text-xs" htmlFor={`summary-${article.id}`}>
            摘要
          </Label>
          <Textarea
            id={`summary-${article.id}`}
            value={formData.summary ?? ""}
            onChange={(e) =>
              setFormData({ ...formData, summary: e.target.value || null })
            }
            rows={2}
            onKeyDown={handleKeyDown}
          />
        </div>

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
      {dragHandle}

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
            <CategoryChip category={article.category} className="text-xs" />
          )}
          {article.authors.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {article.authors.join(", ")}
            </Badge>
          )}
          {article.articleGames.map((ag) => (
            <GameChip key={ag.game.id} name={ag.game.name} className="text-xs" />
          ))}
          {article.articleTags.map((at) => (
            <TagChip
              key={at.tag.id}
              tag={{ name: at.tag.name, type: at.tag.type }}
              withTypeLabel
              className="text-xs"
            />
          ))}
        </div>
      </div>

      {/* Action buttons (visible on hover) */}
      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Insert where the gap actually is: a missed entry belongs next to
            its neighbours, not appended to the end of 61 rows. */}
        {onInsert && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-auto gap-0 px-1.5"
              title="在此列上方新增文章"
              onClick={(e) => {
                e.stopPropagation();
                onInsert("before");
              }}
            >
              <BetweenHorizontalStart className="h-4 w-4" />
              <ArrowUp className="-ml-0.5 h-2.5 w-2.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-auto gap-0 px-1.5"
              title="在此列下方新增文章"
              onClick={(e) => {
                e.stopPropagation();
                onInsert("after");
              }}
            >
              <BetweenHorizontalStart className="h-4 w-4" />
              <ArrowDown className="-ml-0.5 h-2.5 w-2.5" />
            </Button>
          </>
        )}
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
        <Button
          variant="ghost"
          size="icon"
          title="刪除文章"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
