"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, FileText, ListPlus, GripVertical, ArrowDownNarrowWide } from "lucide-react";
import { byPageNumber } from "@/lib/article-sort";
import { BatchArticleForm } from "./BatchArticleForm";
import {
  EditableArticleRow,
  type ArticleItem,
  type ArticleUpdatePayload,
} from "./EditableArticleRow";

interface ArticleListClientProps {
  articles: ArticleItem[];
  issueId: string;
  magazineId: string;
}

function SortableArticleRow({
  article,
  children,
}: {
  article: ArticleItem;
  children: (dragHandle: React.ReactNode) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: article.id });

  const handle = (
    <button
      className="shrink-0 cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground"
      title="拖曳排序"
      // The row opens the quick editor on click, which a drag must not trigger.
      onClick={(e) => e.stopPropagation()}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {children(handle)}
    </div>
  );
}

export function ArticleListClient({
  articles: initialArticles,
  issueId,
}: ArticleListClientProps) {
  const router = useRouter();
  const [articles, setArticles] = useState(initialArticles);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ArticleItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSorting, setIsSorting] = useState(false);

  // A save or a delete re-renders the page, and the fresh list arrives as a prop.
  useEffect(() => setArticles(initialArticles), [initialArticles]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const saveOrder = async (ordered: ArticleItem[]) => {
    const previous = articles;
    setArticles(ordered); // optimistic update
    try {
      const res = await fetch("/api/articles/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId,
          articleIds: ordered.map((a) => a.id),
        }),
      });
      if (!res.ok) throw new Error("Reorder failed");
      toast.success("排序已更新");
      router.refresh();
    } catch {
      setArticles(previous); // rollback
      toast.error("排序更新失敗");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = articles.findIndex((a) => a.id === active.id);
    const newIndex = articles.findIndex((a) => a.id === over.id);
    await saveOrder(arrayMove(articles, oldIndex, newIndex));
  };

  const handleSortByPage = async () => {
    setIsSorting(true);
    try {
      await saveOrder([...articles].sort(byPageNumber));
    } finally {
      setIsSorting(false);
    }
  };

  const handleSaveEdit = async (
    articleId: string,
    data: ArticleUpdatePayload
  ) => {
    const res = await fetch(`/api/articles/${articleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update article");
    }
    setEditingId(null);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/articles/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete article");
      }
      setDeleteTarget(null);
      setEditingId(null);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>文章列表</CardTitle>
            <CardDescription>共 {articles.length} 篇文章</CardDescription>
          </div>
          <div className="flex gap-2">
            {articles.length > 1 && (
              <Button
                variant="outline"
                onClick={handleSortByPage}
                disabled={isSorting}
              >
                <ArrowDownNarrowWide className="mr-2 h-4 w-4" />
                依頁碼排序
              </Button>
            )}
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
            <DndContext
              // An explicit id -- see IssueListClient for why.
              id="article-list"
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={articles.map((a) => a.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {articles.map((article) => (
                    <SortableArticleRow key={article.id} article={article}>
                      {(dragHandle) => (
                        <EditableArticleRow
                          article={article}
                          isEditing={editingId === article.id}
                          onStartEdit={() => setEditingId(article.id)}
                          onSaveEdit={(data) => handleSaveEdit(article.id, data)}
                          onCancelEdit={() => setEditingId(null)}
                          onDelete={() => setDeleteTarget(article)}
                          dragHandle={dragHandle}
                        />
                      )}
                    </SortableArticleRow>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          {showBatchForm && (
            <BatchArticleForm
              issueId={issueId}
              onDone={() => setShowBatchForm(false)}
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除文章</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除「{deleteTarget?.title}」嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "刪除中..." : "刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
