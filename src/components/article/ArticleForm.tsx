"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  articleUpdateSchema,
  type ArticleUpdateInput,
} from "@/lib/validators/article";
import { Loader2, X, Plus, Gamepad2, Tags } from "lucide-react";
import { toast } from "sonner";

interface ArticleFormProps {
  articleId: string;
  issueId: string;
  magazineId: string;
  issueName: string;
  magazineName: string;
  initialData: {
    title: string;
    subtitle?: string | null;
    authors: string[];
    category?: string | null;
    pageStart?: number | null;
    pageEnd?: number | null;
    summary?: string | null;
    content?: string | null;
    sortOrder: number;
    articleGames?: Array<{
      game: { id: string; name: string };
      isPrimary: boolean;
    }>;
    articleTags?: Array<{
      tag: { id: string; name: string; type: string };
    }>;
  };
}

export function ArticleForm({
  articleId,
  issueId,
  magazineId,
  issueName,
  magazineName,
  initialData,
}: ArticleFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authors, setAuthors] = useState<string[]>(initialData.authors || []);
  const [newAuthor, setNewAuthor] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ArticleUpdateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(articleUpdateSchema) as any,
    defaultValues: {
      title: initialData.title,
      subtitle: initialData.subtitle || "",
      category: initialData.category || "",
      pageStart: initialData.pageStart,
      pageEnd: initialData.pageEnd,
      summary: initialData.summary || "",
      content: initialData.content || "",
      sortOrder: initialData.sortOrder,
    },
  });

  const addAuthor = () => {
    const trimmed = newAuthor.trim();
    if (trimmed && !authors.includes(trimmed)) {
      setAuthors([...authors, trimmed]);
      setNewAuthor("");
    }
  };

  const removeAuthor = (author: string) => {
    setAuthors(authors.filter((a) => a !== author));
  };

  const onSubmit = async (data: ArticleUpdateInput) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/articles/${articleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          authors,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "更新失敗");
      }

      toast.success("文章已更新");
      router.push(`/admin/magazines/${magazineId}/issues/${issueId}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "發生未知錯誤");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("確定要刪除這篇文章嗎？此操作無法復原。")) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/articles/${articleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("刪除失敗");
      }

      toast.success("文章已刪除");
      router.push(`/admin/magazines/${magazineId}/issues/${issueId}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "發生未知錯誤");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Breadcrumb info */}
      <div className="text-sm text-muted-foreground">
        {magazineName} / {issueName}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>編輯文章</CardTitle>
          <CardDescription>修改文章的詳細資訊</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* 標題 */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">
                標題 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="文章標題"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* 副標題 */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="subtitle">副標題</Label>
              <Input
                id="subtitle"
                placeholder="副標題或說明文字"
                {...register("subtitle")}
              />
            </div>

            {/* 分類 */}
            <div className="space-y-2">
              <Label htmlFor="category">分類</Label>
              <Input
                id="category"
                placeholder="例如：評測、攻略、新聞"
                {...register("category")}
              />
            </div>

            {/* 排序 */}
            <div className="space-y-2">
              <Label htmlFor="sortOrder">排序</Label>
              <Input
                id="sortOrder"
                type="number"
                {...register("sortOrder")}
              />
            </div>

            {/* 起始頁碼 */}
            <div className="space-y-2">
              <Label htmlFor="pageStart">起始頁碼</Label>
              <Input
                id="pageStart"
                type="number"
                placeholder="例如：10"
                {...register("pageStart")}
              />
            </div>

            {/* 結束頁碼 */}
            <div className="space-y-2">
              <Label htmlFor="pageEnd">結束頁碼</Label>
              <Input
                id="pageEnd"
                type="number"
                placeholder="例如：15"
                {...register("pageEnd")}
              />
            </div>

            {/* 作者 */}
            <div className="space-y-2 md:col-span-2">
              <Label>作者</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {authors.map((author) => (
                  <Badge key={author} variant="secondary" className="gap-1">
                    {author}
                    <button
                      type="button"
                      onClick={() => removeAuthor(author)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="輸入作者名稱"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAuthor();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addAuthor}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 摘要 */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="summary">摘要</Label>
              <Textarea
                id="summary"
                placeholder="文章摘要或簡介"
                rows={3}
                {...register("summary")}
              />
            </div>

            {/* 內容 */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="content">內容</Label>
              <Textarea
                id="content"
                placeholder="完整文章內容（選填）"
                rows={6}
                {...register("content")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 關聯的遊戲與標籤（唯讀顯示） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">關聯資料</CardTitle>
          <CardDescription>目前關聯的遊戲與標籤</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 關聯遊戲 */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-sm font-medium">
              <Gamepad2 className="h-4 w-4" />
              遊戲
            </div>
            {initialData.articleGames && initialData.articleGames.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {initialData.articleGames.map((ag) => (
                  <Badge
                    key={ag.game.id}
                    variant={ag.isPrimary ? "default" : "secondary"}
                  >
                    {ag.game.name}
                    {ag.isPrimary && " (主要)"}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">無關聯遊戲</p>
            )}
          </div>

          {/* 關聯標籤 */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-sm font-medium">
              <Tags className="h-4 w-4" />
              標籤
            </div>
            {initialData.articleTags && initialData.articleTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {initialData.articleTags.map((at) => (
                  <Badge key={at.tag.id} variant="outline">
                    {at.tag.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">無關聯標籤</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 操作按鈕 */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={isSubmitting}
        >
          刪除文章
        </Button>
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            儲存變更
          </Button>
        </div>
      </div>
    </form>
  );
}
