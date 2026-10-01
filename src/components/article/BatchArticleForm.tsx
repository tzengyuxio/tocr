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
import type { ArticleCategory } from "@/lib/article-categories";

interface ArticleRow {
  key: number;
  title: string;
  subtitle: string;
  category: ArticleCategory | "";
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

const COLUMNS: {
  field: Exclude<keyof ArticleRow, "key">;
  header: string;
  headClass: string;
  placeholder: string;
  type?: "number";
}[] = [
  { field: "title", header: "標題 *", headClass: "min-w-[200px]", placeholder: "文章標題" },
  { field: "subtitle", header: "副標題", headClass: "min-w-[150px]", placeholder: "副標題" },
  { field: "category", header: "分類", headClass: "min-w-[100px]", placeholder: "分類" },
  { field: "pageStart", header: "起始頁", headClass: "w-[80px]", placeholder: "起始", type: "number" },
  { field: "pageEnd", header: "結束頁", headClass: "w-[80px]", placeholder: "結束", type: "number" },
  { field: "authors", header: "作者（逗號分隔）", headClass: "min-w-[150px]", placeholder: "作者1, 作者2" },
];

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
              {COLUMNS.map((column) => (
                <TableHead key={column.field} className={column.headClass}>
                  {column.header}
                </TableHead>
              ))}
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                {COLUMNS.map((column) => (
                  <TableCell key={column.field}>
                    <Input
                      type={column.type}
                      placeholder={column.placeholder}
                      value={row[column.field]}
                      onChange={(e) =>
                        updateRow(row.key, column.field, e.target.value)
                      }
                      disabled={isSubmitting}
                    />
                  </TableCell>
                ))}
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
