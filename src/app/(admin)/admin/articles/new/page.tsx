"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  articleCreateSchema,
  type ArticleCreateInput,
} from "@/lib/validators/article";
import { Loader2, X, Plus } from "lucide-react";
import { toast } from "sonner";

interface Issue {
  id: string;
  issueNumber: string;
  magazine: {
    id: string;
    name: string;
  };
}

function NewArticleForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedIssueId = searchParams.get("issueId") || "";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [authors, setAuthors] = useState<string[]>([]);
  const [newAuthor, setNewAuthor] = useState("");
  const [loadingIssues, setLoadingIssues] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ArticleCreateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(articleCreateSchema) as any,
    defaultValues: {
      issueId: preselectedIssueId,
      title: "",
      subtitle: "",
      category: "",
      pageStart: null,
      pageEnd: null,
      summary: "",
      content: "",
      sortOrder: 0,
    },
  });

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const response = await fetch("/api/issues?limit=100");
        if (response.ok) {
          const data = await response.json();
          setIssues(data.data || []);

          // 如果有預選的 issueId，找到對應的 issue
          if (preselectedIssueId) {
            const issue = data.data?.find(
              (i: Issue) => i.id === preselectedIssueId
            );
            if (issue) {
              setSelectedIssue(issue);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch issues:", error);
      } finally {
        setLoadingIssues(false);
      }
    };
    fetchIssues();
  }, [preselectedIssueId]);

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

  const onSubmit = async (data: ArticleCreateInput) => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          authors,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "新增失敗");
      }

      toast.success("文章已新增");
      if (selectedIssue) {
        router.push(
          `/admin/magazines/${selectedIssue.magazine.id}/issues/${selectedIssue.id}`
        );
      } else {
        router.push("/admin/articles");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "發生未知錯誤");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>新增文章</CardTitle>
            <CardDescription>手動新增一篇文章到期數中</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 選擇期數 */}
            <div className="space-y-2">
              <Label>
                期數 <span className="text-red-500">*</span>
              </Label>
              {loadingIssues ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  載入中...
                </div>
              ) : (
                <Select
                  value={selectedIssue?.id || ""}
                  onValueChange={(value) => {
                    const issue = issues.find((i) => i.id === value);
                    setSelectedIssue(issue || null);
                    setValue("issueId", value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇期數" />
                  </SelectTrigger>
                  <SelectContent>
                    {issues.map((issue) => (
                      <SelectItem key={issue.id} value={issue.id}>
                        {issue.magazine.name} - {issue.issueNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.issueId && (
                <p className="text-sm text-red-500">{errors.issueId.message}</p>
              )}
            </div>

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
                <div className="mb-2 flex flex-wrap gap-2">
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

            {/* 操作按鈕 */}
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                新增文章
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

export default function NewArticlePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewArticleForm />
    </Suspense>
  );
}
