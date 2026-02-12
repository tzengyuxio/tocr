# UI Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add icon button tooltips, redesign OCR result editor with side-by-side image viewer + in-place editing, and add tag/game detail views with hierarchical article grouping.

**Architecture:** Modify existing components to add `title` attributes. Rewrite `OcrResultEditor` as a two-column layout with sticky image viewer and expandable inline editing rows. Create new admin detail pages for tags and games with grouped magazine→issue→article tree views. Enhance existing APIs to return full article data without the 20-item limit.

**Tech Stack:** Next.js 16 (App Router), React, shadcn/ui (Dialog, Collapsible), Tailwind CSS, Prisma ORM.

---

### Task 1: Add hover text to all icon buttons

**Files:**
- Modify: `src/components/magazine/MagazineListClient.tsx:96-112`
- Modify: `src/components/magazine/IssueListClient.tsx:96-141`
- Modify: `src/components/ocr/OcrResultEditor.tsx:237-251`
- Modify: `src/app/(admin)/admin/tags/page.tsx:258-271`
- Modify: `src/app/(admin)/admin/games/page.tsx:308-321`

**Step 1: Add title to MagazineListClient buttons**

In `src/components/magazine/MagazineListClient.tsx`, add `title` attributes:

Line 96 — Edit button:
```tsx
<Button asChild variant="ghost" size="icon" title="編輯期刊">
```

Line 101 — Plus button:
```tsx
<Button
  variant="ghost"
  size="icon"
  title="新增期數"
  onClick={() =>
```

**Step 2: Add title to IssueListClient buttons**

In `src/components/magazine/IssueListClient.tsx`:

Line 96 — Grip handle:
```tsx
<button
  className="cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground"
  title="拖曳排序"
  {...attributes}
  {...listeners}
>
```

Line 127 — Edit button:
```tsx
<Button asChild variant="ghost" size="icon" title="編輯期數">
```

Line 132 — Delete button:
```tsx
<Button
  variant="ghost"
  size="icon"
  title="刪除期數"
  onClick={() => onDelete(issue)}
```

**Step 3: Add title to OcrResultEditor buttons**

In `src/components/ocr/OcrResultEditor.tsx`:

Line 237 — Edit button:
```tsx
<Button
  variant="ghost"
  size="icon"
  title="編輯"
  onClick={() => handleEdit(index)}
>
```

Line 244 — Delete button:
```tsx
<Button
  variant="ghost"
  size="icon"
  title="刪除"
  onClick={() => handleDelete(index)}
>
```

**Step 4: Add title to Tags page buttons**

In `src/app/(admin)/admin/tags/page.tsx`:

Line 258 — Edit button:
```tsx
<Button
  variant="ghost"
  size="icon"
  title="編輯標籤"
  onClick={() => handleOpenEdit(tag)}
>
```

Line 265 — Delete button:
```tsx
<Button
  variant="ghost"
  size="icon"
  title="刪除標籤"
  onClick={() => handleDelete(tag.id)}
>
```

**Step 5: Add title to Games page buttons**

In `src/app/(admin)/admin/games/page.tsx`:

Line 308 — Edit button:
```tsx
<Button
  variant="ghost"
  size="icon"
  title="編輯遊戲"
  onClick={() => handleOpenEdit(game)}
>
```

Line 315 — Delete button:
```tsx
<Button
  variant="ghost"
  size="icon"
  title="刪除遊戲"
  onClick={() => handleDelete(game.id)}
>
```

**Step 6: Verify**

Run: `pnpm build`

---

### Task 2: Redesign OcrResultEditor — two-column layout with in-place editing

**Files:**
- Rewrite: `src/components/ocr/OcrResultEditor.tsx`
- Modify: `src/app/(admin)/admin/ocr/OcrPageClient.tsx:225-230`

**Step 1: Update OcrPageClient to pass tocImages**

In `src/app/(admin)/admin/ocr/OcrPageClient.tsx`, modify the OcrResultEditor usage (around line 225):

```tsx
<OcrResultEditor
  result={ocrResult}
  issueId={selectedIssueId}
  tocImages={selectedIssue?.tocImages || []}
  onSave={handleSave}
  onCancel={handleCancel}
/>
```

**Step 2: Rewrite OcrResultEditor**

Replace the entire `src/components/ocr/OcrResultEditor.tsx` with:

```tsx
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
  ImageIcon,
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
          <div className={`flex gap-6 ${hasTocImages ? "" : ""}`}>
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
```

**Step 3: Verify**

Run: `pnpm build`

**Step 4: Manual test**

Start `pnpm dev`, go to OCR page, select an issue with tocImages, run recognition:
- Left side shows TOC image with prev/next navigation
- Click image to zoom in a Dialog
- Right side shows article rows; click a row to expand in-place editing
- Press Esc to cancel, click "確認" to save edits
- Hover over delete icon shows trash, click deletes the row

---

### Task 3: Enhance tag/game API to return all articles with grouping data

**Files:**
- Modify: `src/app/api/tags/[id]/route.ts:6-55`
- Modify: `src/app/api/games/[id]/route.ts:6-58`

**Step 1: Update tag GET endpoint**

In `src/app/api/tags/[id]/route.ts`, update the GET handler to accept a `?all=true` query param that removes the `take: 20` limit and adds publishDate + pageStart/pageEnd to the article select:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const all = searchParams.get("all") === "true";

    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        articleTags: {
          ...(all ? {} : { take: 20 }),
          orderBy: { createdAt: "desc" },
          include: {
            article: {
              select: {
                id: true,
                title: true,
                category: true,
                pageStart: true,
                pageEnd: true,
                issue: {
                  select: {
                    id: true,
                    issueNumber: true,
                    publishDate: true,
                    magazine: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
          },
        },
        _count: {
          select: { articleTags: true },
        },
      },
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    return NextResponse.json(tag);
  } catch (error) {
    console.error("Failed to fetch tag:", error);
    return NextResponse.json(
      { error: "Failed to fetch tag" },
      { status: 500 }
    );
  }
}
```

**Step 2: Update game GET endpoint**

Same pattern in `src/app/api/games/[id]/route.ts`:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const all = searchParams.get("all") === "true";

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        articleGames: {
          ...(all ? {} : { take: 20 }),
          orderBy: { createdAt: "desc" },
          include: {
            article: {
              select: {
                id: true,
                title: true,
                category: true,
                pageStart: true,
                pageEnd: true,
                issue: {
                  select: {
                    id: true,
                    issueNumber: true,
                    publishDate: true,
                    magazine: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
          },
        },
        _count: {
          select: { articleGames: true },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error("Failed to fetch game:", error);
    return NextResponse.json(
      { error: "Failed to fetch game" },
      { status: 500 }
    );
  }
}
```

**Step 3: Verify**

Run: `pnpm build`

---

### Task 4: Add inline article preview to tag list page

**Files:**
- Modify: `src/app/(admin)/admin/tags/page.tsx`

**Step 1: Add expandable preview to tag rows**

Add state and fetch logic. In `src/app/(admin)/admin/tags/page.tsx`, add after existing state declarations (around line 74):

```typescript
const [expandedTagId, setExpandedTagId] = useState<string | null>(null);
const [expandedData, setExpandedData] = useState<{
  articleTags: {
    article: {
      id: string;
      title: string;
      category: string | null;
      pageStart: number | null;
      pageEnd: number | null;
      issue: {
        id: string;
        issueNumber: string;
        publishDate: string;
        magazine: { id: string; name: string };
      };
    };
  }[];
  _count: { articleTags: number };
} | null>(null);
const [isLoadingPreview, setIsLoadingPreview] = useState(false);

const handleToggleExpand = async (tagId: string) => {
  if (expandedTagId === tagId) {
    setExpandedTagId(null);
    setExpandedData(null);
    return;
  }
  setExpandedTagId(tagId);
  setIsLoadingPreview(true);
  try {
    const res = await fetch(`/api/tags/${tagId}`);
    const data = await res.json();
    setExpandedData(data);
  } catch {
    setExpandedData(null);
  } finally {
    setIsLoadingPreview(false);
  }
};
```

**Step 2: Add Link import and Eye icon**

Add to imports:
```typescript
import { Plus, Edit, Trash2, Loader2, Tags, Eye, ExternalLink } from "lucide-react";
import Link from "next/link";
```

**Step 3: Make article count clickable and add preview row**

Replace the TableCell for article count (around line 255) and add a preview row after each tag row:

Replace the article count cell:
```tsx
<TableCell>
  <Button
    variant="ghost"
    size="sm"
    className="h-auto p-0 font-normal hover:underline"
    onClick={() => handleToggleExpand(tag.id)}
    title="展開預覽"
  >
    {tag._count.articleTags} 篇
    <Eye className="ml-1 h-3 w-3" />
  </Button>
</TableCell>
```

After the closing `</TableRow>` for each tag (inside the map), add a conditional preview row:

```tsx
{expandedTagId === tag.id && (
  <TableRow>
    <TableCell colSpan={5} className="bg-muted/30 p-4">
      {isLoadingPreview ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : expandedData ? (
        <div className="space-y-2">
          {expandedData.articleTags.slice(0, 5).map((at) => (
            <div
              key={at.article.id}
              className="flex items-center gap-3 rounded px-3 py-2 text-sm hover:bg-muted"
            >
              <span className="shrink-0 text-muted-foreground">
                {at.article.issue.magazine.name}
              </span>
              <span className="shrink-0 text-muted-foreground">›</span>
              <span className="shrink-0 text-muted-foreground">
                {at.article.issue.issueNumber}
              </span>
              <span className="shrink-0 text-muted-foreground">›</span>
              <span className="flex-1 truncate font-medium">
                {at.article.title}
              </span>
              {at.article.category && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {at.article.category}
                </Badge>
              )}
            </div>
          ))}
          {expandedData._count.articleTags > 5 && (
            <div className="pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/tags/${tag.id}`}>
                  查看全部 {expandedData._count.articleTags} 篇
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          )}
          {expandedData._count.articleTags <= 5 && expandedData._count.articleTags > 0 && (
            <div className="pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/tags/${tag.id}`}>
                  查看完整頁面
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">載入失敗</p>
      )}
    </TableCell>
  </TableRow>
)}
```

**Step 4: Verify**

Run: `pnpm build`

---

### Task 5: Add inline article preview to game list page

**Files:**
- Modify: `src/app/(admin)/admin/games/page.tsx`

**Step 1: Add expandable preview logic**

Same pattern as tags. Add after existing state declarations (around line 73):

```typescript
const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
const [expandedData, setExpandedData] = useState<{
  articleGames: {
    article: {
      id: string;
      title: string;
      category: string | null;
      pageStart: number | null;
      pageEnd: number | null;
      issue: {
        id: string;
        issueNumber: string;
        publishDate: string;
        magazine: { id: string; name: string };
      };
    };
  }[];
  _count: { articleGames: number };
} | null>(null);
const [isLoadingPreview, setIsLoadingPreview] = useState(false);

const handleToggleExpand = async (gameId: string) => {
  if (expandedGameId === gameId) {
    setExpandedGameId(null);
    setExpandedData(null);
    return;
  }
  setExpandedGameId(gameId);
  setIsLoadingPreview(true);
  try {
    const res = await fetch(`/api/games/${gameId}`);
    const data = await res.json();
    setExpandedData(data);
  } catch {
    setExpandedData(null);
  } finally {
    setIsLoadingPreview(false);
  }
};
```

**Step 2: Add Link import and icons**

Add to imports:
```typescript
import { Plus, Edit, Trash2, Loader2, Gamepad2, Search, Eye, ExternalLink } from "lucide-react";
import Link from "next/link";
```

**Step 3: Make article count clickable and add preview row**

Replace the article count cell (around line 305):
```tsx
<TableCell>
  <Button
    variant="ghost"
    size="sm"
    className="h-auto p-0 font-normal hover:underline"
    onClick={() => handleToggleExpand(game.id)}
    title="展開預覽"
  >
    {game._count.articleGames} 篇
    <Eye className="ml-1 h-3 w-3" />
  </Button>
</TableCell>
```

After each game's `</TableRow>`:
```tsx
{expandedGameId === game.id && (
  <TableRow>
    <TableCell colSpan={6} className="bg-muted/30 p-4">
      {isLoadingPreview ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : expandedData ? (
        <div className="space-y-2">
          {expandedData.articleGames.slice(0, 5).map((ag) => (
            <div
              key={ag.article.id}
              className="flex items-center gap-3 rounded px-3 py-2 text-sm hover:bg-muted"
            >
              <span className="shrink-0 text-muted-foreground">
                {ag.article.issue.magazine.name}
              </span>
              <span className="shrink-0 text-muted-foreground">›</span>
              <span className="shrink-0 text-muted-foreground">
                {ag.article.issue.issueNumber}
              </span>
              <span className="shrink-0 text-muted-foreground">›</span>
              <span className="flex-1 truncate font-medium">
                {ag.article.title}
              </span>
              {ag.article.category && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {ag.article.category}
                </Badge>
              )}
            </div>
          ))}
          {expandedData._count.articleGames > 5 && (
            <div className="pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/games/${game.id}`}>
                  查看全部 {expandedData._count.articleGames} 篇
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          )}
          {expandedData._count.articleGames <= 5 && expandedData._count.articleGames > 0 && (
            <div className="pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/games/${game.id}`}>
                  查看完整頁面
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">載入失敗</p>
      )}
    </TableCell>
  </TableRow>
)}
```

**Step 4: Verify**

Run: `pnpm build`

---

### Task 6: Create admin tag detail page with grouped article tree

**Files:**
- Create: `src/app/(admin)/admin/tags/[id]/page.tsx`

**Step 1: Create the tag detail page**

Create `src/app/(admin)/admin/tags/[id]/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Tags,
  BookOpen,
  FileText,
} from "lucide-react";

const TAG_TYPES: Record<string, string> = {
  GENERAL: "一般",
  PERSON: "人物",
  EVENT: "活動",
  SERIES: "系列",
  COMPANY: "公司",
  PLATFORM: "平台",
};

interface ArticleData {
  id: string;
  title: string;
  category: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  issue: {
    id: string;
    issueNumber: string;
    publishDate: string;
    magazine: { id: string; name: string };
  };
}

interface GroupedData {
  magazine: { id: string; name: string };
  issues: {
    issue: { id: string; issueNumber: string; publishDate: string };
    articles: ArticleData[];
  }[];
}

function groupArticles(articles: ArticleData[]): GroupedData[] {
  const magazineMap = new Map<string, GroupedData>();

  for (const article of articles) {
    const mag = article.issue.magazine;
    if (!magazineMap.has(mag.id)) {
      magazineMap.set(mag.id, { magazine: mag, issues: [] });
    }
    const group = magazineMap.get(mag.id)!;

    let issueGroup = group.issues.find(
      (ig) => ig.issue.id === article.issue.id
    );
    if (!issueGroup) {
      issueGroup = {
        issue: {
          id: article.issue.id,
          issueNumber: article.issue.issueNumber,
          publishDate: article.issue.publishDate,
        },
        articles: [],
      };
      group.issues.push(issueGroup);
    }
    issueGroup.articles.push(article);
  }

  // Sort issues by publishDate descending within each magazine
  for (const group of magazineMap.values()) {
    group.issues.sort(
      (a, b) =>
        new Date(b.issue.publishDate).getTime() -
        new Date(a.issue.publishDate).getTime()
    );
  }

  return Array.from(magazineMap.values()).sort((a, b) =>
    a.magazine.name.localeCompare(b.magazine.name)
  );
}

export default function TagDetailPage() {
  const params = useParams<{ id: string }>();
  const [tag, setTag] = useState<{
    id: string;
    name: string;
    slug: string;
    type: string;
    description: string | null;
    _count: { articleTags: number };
  } | null>(null);
  const [grouped, setGrouped] = useState<GroupedData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/tags/${params.id}?all=true`);
        const data = await res.json();
        setTag({
          id: data.id,
          name: data.name,
          slug: data.slug,
          type: data.type,
          description: data.description,
          _count: data._count,
        });
        const articles = data.articleTags.map(
          (at: { article: ArticleData }) => at.article
        );
        setGrouped(groupArticles(articles));
      } catch (err) {
        console.error("Failed to load tag:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tag) {
    return <p className="py-12 text-center text-muted-foreground">找不到標籤</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/tags">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Tags className="h-6 w-6" />
              {tag.name}
            </h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{TAG_TYPES[tag.type] || tag.type}</Badge>
              <span>{tag._count.articleTags} 篇相關文章</span>
              {tag.description && <span>· {tag.description}</span>}
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>相關文章</CardTitle>
          <CardDescription>
            出現在 {grouped.length} 本期刊、
            {grouped.reduce((sum, g) => sum + g.issues.length, 0)} 期中
          </CardDescription>
        </CardHeader>
        <CardContent>
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">尚無相關文章</h3>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map((group) => (
                <Collapsible key={group.magazine.id} defaultOpen>
                  <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg bg-muted px-4 py-3 text-left font-medium hover:bg-muted/80 transition-colors [&[data-state=open]>svg]:rotate-90">
                    <ChevronRight className="h-4 w-4 shrink-0 transition-transform" />
                    <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1">{group.magazine.name}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {group.issues.length} 期・
                      {group.issues.reduce((s, ig) => s + ig.articles.length, 0)} 篇
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 border-l pl-4 pt-2 space-y-3">
                      {group.issues.map((issueGroup) => (
                        <Collapsible key={issueGroup.issue.id} defaultOpen>
                          <CollapsibleTrigger className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors [&[data-state=open]>svg]:rotate-90">
                            <ChevronRight className="h-3 w-3 shrink-0 transition-transform" />
                            <span className="font-medium">
                              {issueGroup.issue.issueNumber}
                            </span>
                            <span className="text-muted-foreground">
                              ({new Date(issueGroup.issue.publishDate).toLocaleDateString("zh-TW")})
                            </span>
                            <span className="text-muted-foreground">
                              — {issueGroup.articles.length} 篇
                            </span>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="ml-5 space-y-1 pt-1">
                              {issueGroup.articles.map((article) => (
                                <Link
                                  key={article.id}
                                  href={`/admin/magazines/${article.issue.magazine.id}/issues/${article.issue.id}`}
                                  className="flex items-center gap-3 rounded px-3 py-2 text-sm hover:bg-muted transition-colors"
                                >
                                  <span className="w-16 shrink-0 text-right font-mono text-xs text-muted-foreground">
                                    {article.pageStart
                                      ? `p.${article.pageStart}${article.pageEnd && article.pageEnd !== article.pageStart ? `-${article.pageEnd}` : ""}`
                                      : ""}
                                  </span>
                                  <span className="flex-1 truncate">
                                    {article.title}
                                  </span>
                                  {article.category && (
                                    <Badge variant="outline" className="text-xs shrink-0">
                                      {article.category}
                                    </Badge>
                                  )}
                                </Link>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Verify**

Run: `pnpm build`

---

### Task 7: Create admin game detail page with grouped article tree

**Files:**
- Create: `src/app/(admin)/admin/games/[id]/page.tsx`

**Step 1: Create the game detail page**

Create `src/app/(admin)/admin/games/[id]/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Gamepad2,
  BookOpen,
  FileText,
} from "lucide-react";

interface ArticleData {
  id: string;
  title: string;
  category: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  issue: {
    id: string;
    issueNumber: string;
    publishDate: string;
    magazine: { id: string; name: string };
  };
}

interface GroupedData {
  magazine: { id: string; name: string };
  issues: {
    issue: { id: string; issueNumber: string; publishDate: string };
    articles: ArticleData[];
  }[];
}

function groupArticles(articles: ArticleData[]): GroupedData[] {
  const magazineMap = new Map<string, GroupedData>();

  for (const article of articles) {
    const mag = article.issue.magazine;
    if (!magazineMap.has(mag.id)) {
      magazineMap.set(mag.id, { magazine: mag, issues: [] });
    }
    const group = magazineMap.get(mag.id)!;

    let issueGroup = group.issues.find(
      (ig) => ig.issue.id === article.issue.id
    );
    if (!issueGroup) {
      issueGroup = {
        issue: {
          id: article.issue.id,
          issueNumber: article.issue.issueNumber,
          publishDate: article.issue.publishDate,
        },
        articles: [],
      };
      group.issues.push(issueGroup);
    }
    issueGroup.articles.push(article);
  }

  for (const group of magazineMap.values()) {
    group.issues.sort(
      (a, b) =>
        new Date(b.issue.publishDate).getTime() -
        new Date(a.issue.publishDate).getTime()
    );
  }

  return Array.from(magazineMap.values()).sort((a, b) =>
    a.magazine.name.localeCompare(b.magazine.name)
  );
}

export default function GameDetailPage() {
  const params = useParams<{ id: string }>();
  const [game, setGame] = useState<{
    id: string;
    name: string;
    nameOriginal: string | null;
    nameEn: string | null;
    slug: string;
    platforms: string[];
    developer: string | null;
    publisher: string | null;
    genres: string[];
    _count: { articleGames: number };
  } | null>(null);
  const [grouped, setGrouped] = useState<GroupedData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/games/${params.id}?all=true`);
        const data = await res.json();
        setGame({
          id: data.id,
          name: data.name,
          nameOriginal: data.nameOriginal,
          nameEn: data.nameEn,
          slug: data.slug,
          platforms: data.platforms,
          developer: data.developer,
          publisher: data.publisher,
          genres: data.genres,
          _count: data._count,
        });
        const articles = data.articleGames.map(
          (ag: { article: ArticleData }) => ag.article
        );
        setGrouped(groupArticles(articles));
      } catch (err) {
        console.error("Failed to load game:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!game) {
    return <p className="py-12 text-center text-muted-foreground">找不到遊戲</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" title="返回遊戲列表">
            <Link href="/admin/games">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Gamepad2 className="h-6 w-6" />
              {game.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {(game.nameOriginal || game.nameEn) && (
                <span>{game.nameOriginal || game.nameEn}</span>
              )}
              {game.developer && <span>· {game.developer}</span>}
              <span>· {game._count.articleGames} 篇相關文章</span>
            </div>
            {(game.platforms.length > 0 || game.genres.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-1">
                {game.platforms.map((p) => (
                  <Badge key={p} variant="outline" className="text-xs">
                    {p}
                  </Badge>
                ))}
                {game.genres.map((g) => (
                  <Badge key={g} variant="secondary" className="text-xs">
                    {g}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>相關文章</CardTitle>
          <CardDescription>
            出現在 {grouped.length} 本期刊、
            {grouped.reduce((sum, g) => sum + g.issues.length, 0)} 期中
          </CardDescription>
        </CardHeader>
        <CardContent>
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">尚無相關文章</h3>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map((group) => (
                <Collapsible key={group.magazine.id} defaultOpen>
                  <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg bg-muted px-4 py-3 text-left font-medium hover:bg-muted/80 transition-colors [&[data-state=open]>svg]:rotate-90">
                    <ChevronRight className="h-4 w-4 shrink-0 transition-transform" />
                    <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1">{group.magazine.name}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {group.issues.length} 期・
                      {group.issues.reduce((s, ig) => s + ig.articles.length, 0)} 篇
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 border-l pl-4 pt-2 space-y-3">
                      {group.issues.map((issueGroup) => (
                        <Collapsible key={issueGroup.issue.id} defaultOpen>
                          <CollapsibleTrigger className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors [&[data-state=open]>svg]:rotate-90">
                            <ChevronRight className="h-3 w-3 shrink-0 transition-transform" />
                            <span className="font-medium">
                              {issueGroup.issue.issueNumber}
                            </span>
                            <span className="text-muted-foreground">
                              ({new Date(issueGroup.issue.publishDate).toLocaleDateString("zh-TW")})
                            </span>
                            <span className="text-muted-foreground">
                              — {issueGroup.articles.length} 篇
                            </span>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="ml-5 space-y-1 pt-1">
                              {issueGroup.articles.map((article) => (
                                <Link
                                  key={article.id}
                                  href={`/admin/magazines/${article.issue.magazine.id}/issues/${article.issue.id}`}
                                  className="flex items-center gap-3 rounded px-3 py-2 text-sm hover:bg-muted transition-colors"
                                >
                                  <span className="w-16 shrink-0 text-right font-mono text-xs text-muted-foreground">
                                    {article.pageStart
                                      ? `p.${article.pageStart}${article.pageEnd && article.pageEnd !== article.pageStart ? `-${article.pageEnd}` : ""}`
                                      : ""}
                                  </span>
                                  <span className="flex-1 truncate">
                                    {article.title}
                                  </span>
                                  {article.category && (
                                    <Badge variant="outline" className="text-xs shrink-0">
                                      {article.category}
                                    </Badge>
                                  )}
                                </Link>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Verify Collapsible component exists**

Check if `src/components/ui/collapsible.tsx` exists. If not:

Run: `npx shadcn@latest add collapsible`

**Step 3: Verify**

Run: `pnpm build`

---

### Task 8: Final integration testing

**Step 1: Run full build**

Run: `pnpm build`

**Step 2: Manual integration test checklist**

With `pnpm dev` running:

1. **Tooltips**: Hover over all icon buttons in magazine list, issue list, OCR editor, tags page, games page — all show Chinese hover text
2. **OCR editor**: Go to OCR page → select issue with tocImages → run recognition:
   - Left side shows TOC image with prev/next and zoom
   - Right side: click article row → expands in-place editor with all fields
   - Esc cancels, checkmark confirms
   - Delete button visible on hover
   - "Save all" works correctly
3. **OCR editor without images**: Select issue without tocImages → editor shows full-width article list (no left column)
4. **Tag preview**: Go to /admin/tags → click article count on any tag → expands 5-row preview → click "查看全部" → navigates to /admin/tags/[id]
5. **Tag detail**: /admin/tags/[id] shows grouped tree: Magazine → Issue → Articles, all collapsible, articles clickable
6. **Game preview**: Same flow as tags at /admin/games
7. **Game detail**: /admin/games/[id] shows game info header + grouped article tree
