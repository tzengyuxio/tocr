# Issue Order, CRUD Improvements & OCR Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add drag-to-reorder for issues, add quick-create and delete issue buttons, and fix the OCR relative URL bug.

**Architecture:** Add `order` field to `Issue` model with a batch reorder API. Convert the magazine detail page to a client component with `@dnd-kit` for drag-and-drop. Add a Dialog-based quick-create form on the magazine list page. Fix the OCR route to resolve relative URLs to absolute before fetching.

**Tech Stack:** Next.js 16 (App Router), Prisma ORM, `@dnd-kit/core` + `@dnd-kit/sortable`, shadcn/ui Dialog, Zod validation.

---

### Task 1: Fix OCR relative URL bug

**Files:**
- Modify: `src/app/api/ocr/route.ts:45-46`

**Step 1: Fix relative URL resolution in OCR route**

In `src/app/api/ocr/route.ts`, replace line 46:

```typescript
// Before:
const response = await fetch(url);

// After:
const origin = new URL(request.url).origin;
const absoluteUrl = url.startsWith('http') ? url : `${origin}${url}`;
const response = await fetch(absoluteUrl);
```

Also apply the same fix to the single `imageUrl` fallback at line 86:

```typescript
// Before:
const response = await fetch(imageUrl);

// After:
const origin = new URL(request.url).origin;
const absoluteImageUrl = imageUrl.startsWith('http') ? imageUrl : `${origin}${imageUrl}`;
const response = await fetch(absoluteImageUrl);
```

Extract `origin` once at the top of the try block to avoid duplication:

```typescript
const origin = new URL(request.url).origin;
```

**Step 2: Verify the fix**

Run: `pnpm build` to confirm no type errors.

**Step 3: Manual test**

Start `pnpm dev`, upload a local image to an issue's tocImages, then click "start recognition" — it should no longer throw `ERR_INVALID_URL`.

---

### Task 2: Add `order` field to Issue model

**Files:**
- Modify: `prisma/schema.prisma:102-124`

**Step 1: Add `order` field to Issue model**

In `prisma/schema.prisma`, add to the `Issue` model (after `notes` field, before `createdAt`):

```prisma
  order      Int      @default(0)
```

**Step 2: Generate and run migration**

Run:
```bash
npx prisma migrate dev --name add_issue_order
```

This creates the migration and updates the Prisma client.

**Step 3: Backfill existing issues with sequential order**

Create a one-time script or use the migration SQL. The migration should include a backfill that sets `order` based on `publish_date` for each magazine:

If the auto-generated migration only adds the column, manually edit the migration SQL to append:

```sql
-- Backfill order based on publish_date within each magazine
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY magazine_id ORDER BY publish_date ASC) - 1 AS rn
  FROM issues
)
UPDATE issues SET "order" = ranked.rn FROM ranked WHERE issues.id = ranked.id;
```

**Step 4: Verify**

Run: `npx prisma studio` and confirm issues have sequential `order` values.

---

### Task 3: Update Issue API to support `order` field

**Files:**
- Modify: `src/app/api/issues/route.ts`
- Modify: `src/lib/validators/issue.ts`
- Create: `src/app/api/issues/reorder/route.ts`

**Step 1: Update Zod validators**

In `src/lib/validators/issue.ts`, add `order` to the create schema (optional, auto-set on backend):

```typescript
export const issueCreateSchema = z.object({
  magazineId: z.string().min(1, "期刊 ID 為必填"),
  issueNumber: z.string().min(1, "期號為必填"),
  volumeNumber: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  publishDate: z.coerce.date({ message: "出版日期為必填" }),
  coverImage: z.string().optional().nullable(),
  tocImages: z.array(z.string()).default([]),
  pageCount: z.coerce.number().int().positive().optional().nullable(),
  price: z.coerce.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  order: z.coerce.number().int().optional(),
});
```

**Step 2: Update POST /api/issues to auto-set order**

In `src/app/api/issues/route.ts`, modify POST handler to auto-assign order:

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = issueCreateSchema.parse(body);

    // Auto-assign order if not provided
    if (validatedData.order === undefined) {
      const maxOrder = await prisma.issue.aggregate({
        where: { magazineId: validatedData.magazineId },
        _max: { order: true },
      });
      validatedData.order = (maxOrder._max.order ?? -1) + 1;
    }

    const issue = await prisma.issue.create({
      data: validatedData,
    });

    return NextResponse.json(issue, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to create issue:", error);
    return NextResponse.json(
      { error: "Failed to create issue" },
      { status: 500 }
    );
  }
}
```

**Step 3: Update GET /api/issues to order by `order`**

In `src/app/api/issues/route.ts`, change `orderBy`:

```typescript
orderBy: { order: "asc" },
```

**Step 4: Create PUT /api/issues/reorder**

Create `src/app/api/issues/reorder/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const reorderSchema = z.object({
  magazineId: z.string().min(1),
  issueIds: z.array(z.string().min(1)),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { magazineId, issueIds } = reorderSchema.parse(body);

    await prisma.$transaction(
      issueIds.map((id, index) =>
        prisma.issue.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to reorder issues:", error);
    return NextResponse.json(
      { error: "Failed to reorder issues" },
      { status: 500 }
    );
  }
}
```

**Step 5: Verify**

Run: `pnpm build` to confirm no type errors.

---

### Task 4: Add drag-and-drop reorder to magazine detail page

**Files:**
- Modify: `src/app/(admin)/admin/magazines/[id]/page.tsx`
- Create: `src/components/magazine/IssueListClient.tsx`

**Step 1: Install @dnd-kit**

Run:
```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Step 2: Extract issue list into client component**

The magazine detail page is a server component. Extract the issue list table into a new client component `src/components/magazine/IssueListClient.tsx`:

```typescript
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
          <Button asChild variant="ghost" size="icon">
            <Link href={`/admin/magazines/${magazineId}/issues/${issue.id}`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
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

export function IssueListClient({ magazineId, issues: initialIssues }: IssueListClientProps) {
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
```

**Step 3: Update magazine detail page to use client component**

Replace the issue list section in `src/app/(admin)/admin/magazines/[id]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MagazineForm } from "@/components/magazine/MagazineForm";
import { IssueListClient } from "@/components/magazine/IssueListClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMagazinePage({ params }: PageProps) {
  const { id } = await params;

  const magazine = await prisma.magazine.findUnique({
    where: { id },
    include: {
      issues: {
        orderBy: { order: "asc" },
        include: {
          _count: {
            select: { articles: true },
          },
        },
      },
    },
  });

  if (!magazine) {
    notFound();
  }

  const formData = {
    id: magazine.id,
    name: magazine.name,
    nameEn: magazine.nameEn,
    publisher: magazine.publisher,
    issn: magazine.issn,
    description: magazine.description,
    coverImage: magazine.coverImage,
    foundedDate: magazine.foundedDate,
    endedDate: magazine.endedDate,
    isActive: magazine.isActive,
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <MagazineForm initialData={formData} mode="edit" />
      </div>
      <IssueListClient magazineId={magazine.id} issues={magazine.issues} />
    </div>
  );
}
```

**Step 4: Verify**

Run: `pnpm build` to confirm no type errors. Then `pnpm dev` and test:
- Drag an issue row by the grip handle to reorder
- Confirm order persists after page reload
- Click trash icon on an issue, confirm delete dialog appears with article count
- Confirm deletion removes the issue

---

### Task 5: Add quick-create issue dialog to magazine list page

**Files:**
- Modify: `src/app/(admin)/admin/magazines/page.tsx`
- Create: `src/components/magazine/QuickCreateIssueDialog.tsx`

**Step 1: Create QuickCreateIssueDialog component**

Create `src/components/magazine/QuickCreateIssueDialog.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const quickCreateSchema = z.object({
  issueNumber: z.string().min(1, "期號為必填"),
  publishDate: z.string().min(1, "出版日期為必填"),
  title: z.string().optional(),
});

type QuickCreateFormData = z.infer<typeof quickCreateSchema>;

interface QuickCreateIssueDialogProps {
  magazineId: string;
  magazineName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickCreateIssueDialog({
  magazineId,
  magazineName,
  open,
  onOpenChange,
}: QuickCreateIssueDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuickCreateFormData>({
    resolver: zodResolver(quickCreateSchema),
  });

  async function onSubmit(data: QuickCreateFormData) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          magazineId,
          issueNumber: data.issueNumber,
          publishDate: data.publishDate,
          title: data.title || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create issue");
      }

      toast.success(`已新增期數：${data.issueNumber}`);
      reset();
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "新增期數失敗"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新增期數 — {magazineName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="issueNumber">期號 *</Label>
            <Input
              id="issueNumber"
              placeholder="例如：42"
              {...register("issueNumber")}
            />
            {errors.issueNumber && (
              <p className="text-sm text-destructive">
                {errors.issueNumber.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="publishDate">出版日期 *</Label>
            <Input
              id="publishDate"
              type="date"
              {...register("publishDate")}
            />
            {errors.publishDate && (
              <p className="text-sm text-destructive">
                {errors.publishDate.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">特輯標題</Label>
            <Input
              id="title"
              placeholder="選填"
              {...register("title")}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "新增中..." : "新增"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Convert magazine list page to use client component for dialog**

The magazine list page (`src/app/(admin)/admin/magazines/page.tsx`) is a server component. Create a thin client wrapper for the magazine table rows that includes the dialog trigger.

Create `src/components/magazine/MagazineListClient.tsx`:

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, BookOpen, Plus } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { QuickCreateIssueDialog } from "./QuickCreateIssueDialog";

interface MagazineItem {
  id: string;
  name: string;
  nameEn: string | null;
  publisher: string | null;
  coverImage: string | null;
  isActive: boolean;
  createdAt: string | Date;
  _count: { issues: number };
}

interface MagazineListClientProps {
  magazines: MagazineItem[];
}

export function MagazineListClient({ magazines }: MagazineListClientProps) {
  const [dialogTarget, setDialogTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>期刊名稱</TableHead>
            <TableHead>出版社</TableHead>
            <TableHead>期數</TableHead>
            <TableHead>狀態</TableHead>
            <TableHead>建立日期</TableHead>
            <TableHead className="w-[120px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {magazines.map((magazine) => (
            <TableRow key={magazine.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {magazine.coverImage ? (
                    <img
                      src={magazine.coverImage}
                      alt={magazine.name}
                      className="h-10 w-8 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-8 items-center justify-center rounded bg-muted">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{magazine.name}</div>
                    {magazine.nameEn && (
                      <div className="text-sm text-muted-foreground">
                        {magazine.nameEn}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>{magazine.publisher || "-"}</TableCell>
              <TableCell>{magazine._count.issues} 期</TableCell>
              <TableCell>
                <Badge
                  variant={magazine.isActive ? "default" : "secondary"}
                >
                  {magazine.isActive ? "發行中" : "已停刊"}
                </Badge>
              </TableCell>
              <TableCell>
                {format(new Date(magazine.createdAt), "yyyy/MM/dd", {
                  locale: zhTW,
                })}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button asChild variant="ghost" size="icon">
                    <Link href={`/admin/magazines/${magazine.id}`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setDialogTarget({
                        id: magazine.id,
                        name: magazine.name,
                      })
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {dialogTarget && (
        <QuickCreateIssueDialog
          magazineId={dialogTarget.id}
          magazineName={dialogTarget.name}
          open={!!dialogTarget}
          onOpenChange={(open) => !open && setDialogTarget(null)}
        />
      )}
    </>
  );
}
```

**Step 3: Update magazine list page to use MagazineListClient**

Replace the table section in `src/app/(admin)/admin/magazines/page.tsx`:

```typescript
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, BookOpen, Upload } from "lucide-react";
import { MagazineListClient } from "@/components/magazine/MagazineListClient";

export default async function MagazinesPage() {
  const magazines = await prisma.magazine.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { issues: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">期刊管理</h2>
          <p className="text-muted-foreground">管理所有期刊的基本資訊</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/magazines/import">
              <Upload className="mr-2 h-4 w-4" />
              批次匯入
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/magazines/new">
              <Plus className="mr-2 h-4 w-4" />
              新增期刊
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>期刊列表</CardTitle>
          <CardDescription>共 {magazines.length} 本期刊</CardDescription>
        </CardHeader>
        <CardContent>
          {magazines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">尚無期刊資料</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                點擊上方「新增期刊」按鈕開始建立您的第一本期刊
              </p>
            </div>
          ) : (
            <MagazineListClient magazines={magazines} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 4: Verify**

Run: `pnpm build` to confirm no type errors. Then `pnpm dev` and test:
- Magazine list shows "+" button per row
- Clicking "+" opens dialog with magazine name in title
- Fill in issue number + date, submit → toast success, list refreshes with updated count

---

### Task 6: Add AlertDialog UI component (if not already present)

**Step 1: Check if AlertDialog component exists**

Check `src/components/ui/alert-dialog.tsx`. If it doesn't exist, generate it:

Run:
```bash
npx shadcn@latest add alert-dialog
```

**Step 2: Verify**

Run: `pnpm build`

---

### Task 7: Final integration testing

**Step 1: Run full build**

Run: `pnpm build`

**Step 2: Manual integration test checklist**

With `pnpm dev` running:

1. **OCR fix**: Go to an issue with local tocImages → click "start recognition" → should work without URL error
2. **Drag reorder**: Go to magazine detail → drag issues by grip handle → reload page → order preserved
3. **Quick create**: Go to magazine list → click "+" → fill form → submit → success toast → count updates
4. **Delete issue**: Go to magazine detail → click trash on an issue → confirm dialog shows article count → delete → issue removed
5. **Order of new issues**: Create a new issue → it appears at the bottom of the list (highest order)
