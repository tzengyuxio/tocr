"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ArticleRow {
  key: number;
  title: string;
  subtitle: string;
  category: string;
  pageStart: string;
  pageEnd: string;
  authors: string;
}

function createEmptyRow(key: number): ArticleRow {
  return {
    key,
    title: "",
    subtitle: "",
    category: "",
    pageStart: "",
    pageEnd: "",
    authors: "",
  };
}

interface BatchArticleFormProps {
  issueId: string;
  onDone: () => void;
}

export function BatchArticleForm({ issueId, onDone }: BatchArticleFormProps) {
  const router = useRouter();
  const [rows, setRows] = useState<ArticleRow[]>([createEmptyRow(0)]);
  const [nextKey, setNextKey] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function addRow() {
    setRows((prev) => [...prev, createEmptyRow(nextKey)]);
    setNextKey((k) => k + 1);
  }

  function removeRow(key: number) {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.key !== key);
    });
  }

  function updateRow(key: number, field: keyof ArticleRow, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r))
    );
  }

  async function handleSubmit() {
    const validRows = rows.filter((r) => r.title.trim());
    if (validRows.length === 0) {
      toast.error("請至少填寫一篇文章的標題");
      return;
    }

    setIsSubmitting(true);
    try {
      const articles = validRows.map((r, index) => ({
        title: r.title.trim(),
        subtitle: r.subtitle.trim() || null,
        category: r.category.trim() || null,
        pageStart: r.pageStart ? parseInt(r.pageStart, 10) || null : null,
        pageEnd: r.pageEnd ? parseInt(r.pageEnd, 10) || null : null,
        authors: r.authors
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        sortOrder: index,
      }));

      const res = await fetch("/api/articles/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId, articles }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to create articles");
      }

      const data = await res.json();
      toast.success(`已新增 ${data.count} 篇文章`);
      onDone();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "批次新增失敗"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">標題 *</TableHead>
              <TableHead className="min-w-[150px]">副標題</TableHead>
              <TableHead className="min-w-[100px]">分類</TableHead>
              <TableHead className="w-[80px]">起始頁</TableHead>
              <TableHead className="w-[80px]">結束頁</TableHead>
              <TableHead className="min-w-[150px]">作者（逗號分隔）</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell>
                  <Input
                    placeholder="文章標題"
                    value={row.title}
                    onChange={(e) =>
                      updateRow(row.key, "title", e.target.value)
                    }
                    disabled={isSubmitting}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="副標題"
                    value={row.subtitle}
                    onChange={(e) =>
                      updateRow(row.key, "subtitle", e.target.value)
                    }
                    disabled={isSubmitting}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="分類"
                    value={row.category}
                    onChange={(e) =>
                      updateRow(row.key, "category", e.target.value)
                    }
                    disabled={isSubmitting}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    placeholder="起始"
                    value={row.pageStart}
                    onChange={(e) =>
                      updateRow(row.key, "pageStart", e.target.value)
                    }
                    disabled={isSubmitting}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    placeholder="結束"
                    value={row.pageEnd}
                    onChange={(e) =>
                      updateRow(row.key, "pageEnd", e.target.value)
                    }
                    disabled={isSubmitting}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="作者1, 作者2"
                    value={row.authors}
                    onChange={(e) =>
                      updateRow(row.key, "authors", e.target.value)
                    }
                    disabled={isSubmitting}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(row.key)}
                    disabled={isSubmitting || rows.length <= 1}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={isSubmitting}
        >
          <Plus className="mr-1 h-4 w-4" />
          新增一行
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          全部儲存
        </Button>
      </div>
    </div>
  );
}
