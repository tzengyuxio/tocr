"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { MultiImageUpload } from "@/components/ui/multi-image-upload";
import {
  issueCreateSchema,
  type IssueCreateInput,
} from "@/lib/validators/issue";
import { Loader2 } from "lucide-react";

interface IssueFormProps {
  magazineId: string;
  magazineName: string;
  initialData?: Partial<IssueCreateInput> & { id?: string };
  mode: "create" | "edit";
}

export function IssueForm({
  magazineId,
  magazineName,
  initialData,
  mode,
}: IssueFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<IssueCreateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(issueCreateSchema) as any,
    defaultValues: {
      magazineId,
      issueNumber: initialData?.issueNumber || "",
      volumeNumber: initialData?.volumeNumber || "",
      title: initialData?.title || "",
      publishDate: initialData?.publishDate || new Date(),
      coverImage: initialData?.coverImage || "",
      tocImages: initialData?.tocImages || [],
      pageCount: initialData?.pageCount || null,
      price: initialData?.price || null,
      notes: initialData?.notes || "",
    },
  });

  const onSubmit = async (data: IssueCreateInput) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const url =
        mode === "create" ? "/api/issues" : `/api/issues/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "操作失敗");
      }

      router.push(`/admin/magazines/${magazineId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "發生未知錯誤");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register("magazineId")} />

      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "新增單期" : "編輯單期"}</CardTitle>
          <CardDescription>
            {magazineName} -{" "}
            {mode === "create" ? "填寫單期的基本資訊" : "修改單期的基本資訊"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* 期號 */}
            <div className="space-y-2">
              <Label htmlFor="issueNumber">
                期號 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="issueNumber"
                placeholder="例如：42、No.3、2024年8月號"
                {...register("issueNumber")}
              />
              <p className="text-xs text-muted-foreground">
                每期的流水編號，例如「42」「No.3」「2024年8月號」
              </p>
              {errors.issueNumber && (
                <p className="text-sm text-red-500">
                  {errors.issueNumber.message}
                </p>
              )}
            </div>

            {/* 卷號 */}
            <div className="space-y-2">
              <Label htmlFor="volumeNumber">卷號</Label>
              <Input
                id="volumeNumber"
                placeholder="例如：Vol.5、第 3 卷"
                {...register("volumeNumber")}
              />
              <p className="text-xs text-muted-foreground">
                將多期歸為一卷的編號，通常以年份或固定期數為單位，選填
              </p>
            </div>

            {/* 出版日期 */}
            <div className="space-y-2">
              <Label htmlFor="publishDate">
                出版日期 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="publishDate"
                type="date"
                {...register("publishDate")}
              />
              {errors.publishDate && (
                <p className="text-sm text-red-500">
                  {errors.publishDate.message}
                </p>
              )}
            </div>

            {/* 頁數 */}
            <div className="space-y-2">
              <Label htmlFor="pageCount">頁數</Label>
              <Input
                id="pageCount"
                type="number"
                placeholder="例如：128"
                {...register("pageCount")}
              />
            </div>

            {/* 價格 */}
            <div className="space-y-2">
              <Label htmlFor="price">價格</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="例如：150"
                {...register("price")}
              />
            </div>

            {/* 特輯標題 */}
            <div className="space-y-2">
              <Label htmlFor="title">特輯標題</Label>
              <Input
                id="title"
                placeholder="本期特輯標題"
                {...register("title")}
              />
            </div>

            {/* 封面圖片 */}
            <div className="space-y-2">
              <Controller
                name="coverImage"
                control={control}
                render={({ field }) => (
                  <ImageUpload
                    label="封面圖片"
                    value={field.value || ""}
                    onChange={field.onChange}
                    folder="issues/covers"
                    description="本期封面圖片"
                  />
                )}
              />
            </div>

            {/* 目錄頁圖片（多張） */}
            <div className="space-y-2 md:col-span-2">
              <Controller
                name="tocImages"
                control={control}
                render={({ field }) => (
                  <MultiImageUpload
                    label="目錄頁圖片"
                    value={field.value || []}
                    onChange={field.onChange}
                    folder="issues/toc"
                    description="用於 AI 辨識目錄內容，可上傳多張"
                  />
                )}
              />
            </div>

            {/* 備註 */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">備註</Label>
              <Textarea
                id="notes"
                placeholder="其他備註資訊..."
                rows={3}
                {...register("notes")}
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mode === "create" ? "建立單期" : "儲存變更"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              取消
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
