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

  const initialTocReviewed = initialData?.tocReviewed ?? false;

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
      altNumbers: initialData?.altNumbers || [],
      slug: initialData?.slug || "",
      volumeNumber: initialData?.volumeNumber || "",
      title: initialData?.title || "",
      publishDate: initialData?.publishDate || "",
      coverImage: initialData?.coverImage || "",
      tocImages: initialData?.tocImages || [],
      pageCount: initialData?.pageCount || null,
      price: initialData?.price || null,
      notes: initialData?.notes || "",
      tocReviewed: initialTocReviewed,
    },
  });

  const onSubmit = async (data: IssueCreateInput) => {
    setIsSubmitting(true);
    setError(null);

    // Only send the review flag when this editor actually changed it, so a page
    // left open does not undo a review somebody else made in the meantime.
    if (data.tocReviewed === initialTocReviewed) {
      delete data.tocReviewed;
    }

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

            {/* 網址代號 */}
            <div className="space-y-2">
              <Label htmlFor="slug">網址代號</Label>
              <Input id="slug" placeholder="留空則自動產生" {...register("slug")} />
              <p className="text-xs text-muted-foreground">
                公開網址用的代號，只需在本刊內唯一。留空會從期號推出（「第163期」→
                「163」）。封面另有編號的刊物請自行填寫，例如電玩通用日期發行號
                「2014-01-30」。改動會讓舊網址失效
              </p>
              {errors.slug && (
                <p className="text-sm text-destructive">{errors.slug.message}</p>
              )}
            </div>

            {/* 其他編號 */}
            <div className="space-y-2 md:col-span-2">
              <Controller
                name="altNumbers"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label>其他編號</Label>
                    <Input
                      placeholder="以逗號分隔（例如：2014 02, HK VOL 308, 1月30日號）"
                      value={(field.value || []).join(", ")}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(
                          val
                            ? val.split(",").map((s) => s.trim()).filter(Boolean)
                            : []
                        );
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      同一期封面／版權頁上並存的其他編號。期號欄放最主要的那個（有總號就放總號），
                      其餘如期別、港版卷號、日期發行號放這裡
                    </p>
                  </div>
                )}
              />
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
                placeholder="1999-05-20、1999-05、1999、1999-22"
                {...register("publishDate")}
              />
              <p className="text-xs text-muted-foreground">
                知道多少寫多少：年、年-月、年-月-日；季別用 21 春、22 夏、23 秋、24 冬
              </p>
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

            {/* 目錄複查狀態 */}
            <div className="space-y-2 md:col-span-2">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-primary"
                  {...register("tocReviewed")}
                />
                <span>
                  <span className="font-medium">目錄已人工複查</span>
                  <span className="block text-xs text-muted-foreground">
                    確認過目錄內容與掃描圖相符。透過 API 辨識建立的目錄不會自動標記
                  </span>
                </span>
              </label>
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
