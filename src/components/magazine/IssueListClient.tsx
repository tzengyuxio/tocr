"use client";

import { useState } from "react";
import Link from "next/link";
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
import { Plus, Edit, BookOpen, GripVertical, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface IssueItem {
  id: string;
  issueNumber: string;
  title: string | null;
  publishDate: string | Date;
  coverImage: string | null;
  order: number;
  _count: { articles: number };
}

interface IssueListClientProps {
  magazineId: string;
  issues: IssueItem[];
}

function SortableRow({
  issue,
  magazineId,
  onDelete,
}: {
  issue: IssueItem;
  magazineId: string;
  onDelete: (issue: IssueItem) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <button
          className="cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground"
          title="拖曳排序"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell>
        {issue.coverImage ? (
          <img
            src={issue.coverImage}
            alt={issue.issueNumber}
            className="h-12 w-9 rounded object-cover"
          />
        ) : (
          <div className="flex h-12 w-9 items-center justify-center rounded bg-muted">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </TableCell>
      <TableCell className="font-medium">{issue.issueNumber}</TableCell>
      <TableCell>{issue.title || "-"}</TableCell>
      <TableCell>
        {format(new Date(issue.publishDate), "yyyy/MM/dd", {
          locale: zhTW,
        })}
      </TableCell>
      <TableCell>{issue._count.articles} 篇</TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button asChild variant="ghost" size="icon" title="編輯期數">
            <Link href={`/admin/magazines/${magazineId}/issues/${issue.id}`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="刪除期數"
            onClick={() => onDelete(issue)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function IssueListClient({
  magazineId,
  issues: initialIssues,
}: IssueListClientProps) {
  const [issues, setIssues] = useState(initialIssues);
  const [deleteTarget, setDeleteTarget] = useState<IssueItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = issues.findIndex((i) => i.id === active.id);
    const newIndex = issues.findIndex((i) => i.id === over.id);
    const newOrder = arrayMove(issues, oldIndex, newIndex);

    setIssues(newOrder); // optimistic update

    try {
      const res = await fetch("/api/issues/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          magazineId,
          issueIds: newOrder.map((i) => i.id),
        }),
      });
      if (!res.ok) throw new Error("Reorder failed");
      toast.success("排序已更新");
    } catch {
      setIssues(initialIssues); // rollback
      toast.error("排序更新失敗");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/issues/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setIssues((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      toast.success(`已刪除期數：${deleteTarget.issueNumber}`);
      router.refresh();
    } catch {
      toast.error("刪除失敗");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>期數列表</CardTitle>
          <CardDescription>共 {issues.length} 期</CardDescription>
        </div>
        <Button asChild>
          <Link href={`/admin/magazines/${magazineId}/issues/new`}>
            <Plus className="mr-2 h-4 w-4" />
            新增期數
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">尚無期數資料</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              點擊「新增期數」按鈕開始建立期數
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]" />
                  <TableHead>封面</TableHead>
                  <TableHead>期號</TableHead>
                  <TableHead>特輯標題</TableHead>
                  <TableHead>出版日期</TableHead>
                  <TableHead>文章數</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <SortableContext
                items={issues.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <TableBody>
                  {issues.map((issue) => (
                    <SortableRow
                      key={issue.id}
                      issue={issue}
                      magazineId={magazineId}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </TableBody>
              </SortableContext>
            </Table>
          </DndContext>
        )}
      </CardContent>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除此期數？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget._count.articles > 0
                ? `此期數「${deleteTarget.issueNumber}」包含 ${deleteTarget._count.articles} 篇文章，刪除後將無法復原。`
                : `確定要刪除期數「${deleteTarget?.issueNumber}」嗎？此操作無法復原。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "刪除中..." : "確定刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
