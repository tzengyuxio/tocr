"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CommaListInput,
  formatStringList,
  parseStringList,
} from "@/components/ui/comma-list-input";
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
import { Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface IssueFormProps {
  magazineId: string;
  magazineName: string;
  // Not part of the form: the short code is generated on create and never
  // edited, it is only shown so an editor can copy the permanent link.
  code?: string;
  initialData?: Partial<IssueCreateInput> & { id?: string };
  mode: "create" | "edit";
  /**
   * Show the 完備 checkbox. ADMIN only -- the server drops the flag from
   * anyone else's save, so this is the visible half of the same rule.
   */
  canMarkComplete?: boolean;
  /**
   * Pin the save row to the foot of the form's own scrollport.
   *
   * Only right where the form is taller than the box that scrolls it -- the
   * edit page's sidebar. On a page that scrolls as a whole, a sticky row would
   * float over the fields instead of sitting under them.
   */
  stickyActions?: boolean;
}

/**
 * The short code is worth copying as a whole URL, not as "/i/x9k": what an
 * editor does with it is paste it somewhere, and a path on its own does not
 * resolve. The origin comes from the browser so it is right in dev too.
 */
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/i/${code}`);
      setCopied(true);
      toast.success("已複製永久連結");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("複製失敗，請手動選取");
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      title="複製永久連結"
      onClick={copy}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      <span className="sr-only">複製永久連結</span>
    </Button>
  );
}

export function IssueForm({
  magazineId,
  magazineName,
  code,
  initialData,
  mode,
  canMarkComplete = false,
  stickyActions = false,
}: IssueFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialTocReviewed = initialData?.tocReviewed ?? false;
  const initialComplete = initialData?.complete ?? false;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<IssueCreateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(issueCreateSchema) as any,
    defaultValues: {
      magazineId,
      issueNumber: initialData?.issueNumber || "",
      altNumbers: initialData?.altNumbers || [],
      slug: initialData?.slug || "",
      // No field of its own: one issue in the whole catalogue uses it, and what
      // it holds -- 第六卷第九號 -- is what altNumbers is for. Kept in the
      // defaults so editing an issue does not silently clear a value it no
      // longer shows.
      volumeNumber: initialData?.volumeNumber || "",
      title: initialData?.title || "",
      publishDate: initialData?.publishDate || "",
      coverImage: initialData?.coverImage || "",
      tocImages: initialData?.tocImages || [],
      pageCount: initialData?.pageCount || null,
      price: initialData?.price || null,
      notes: initialData?.notes || "",
      tocReviewed: initialTocReviewed,
      complete: initialComplete,
    },
  });

  // The banner in the article list marks the review while this form is on
  // screen, and the refresh that follows only updates the props: the checkbox
  // keeps the value it was mounted with. Left alone, the two halves disagree,
  // the comparison below reads that as "the editor unticked it", and the next
  // save writes the review back off -- which is what happened to 15 issues.
  useEffect(() => {
    setValue("tocReviewed", initialTocReviewed);
  }, [initialTocReviewed, setValue]);

  useEffect(() => {
    setValue("complete", initialComplete);
  }, [initialComplete, setValue]);

  const onSubmit = async (data: IssueCreateInput) => {
    setIsSubmitting(true);
    setError(null);

    // Only send the review flag when this editor actually changed it, so a page
    // left open does not undo a review somebody else made in the meantime.
    if (data.tocReviewed === initialTocReviewed) {
      delete data.tocReviewed;
    }

    // Same reasoning for 完備, plus one of its own: an unchanged flag sent back
    // would count as the admin re-confirming a record they only opened to fix
    // a typo in.
    if (data.complete === initialComplete) {
      delete data.complete;
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
        {/* @container, not the viewport: this form is a narrow sidebar on the
            edit page and a wide card on the create page, and the fields should
            follow the space they actually have. */}
        <CardContent className="@container space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="grid gap-6 @md:grid-cols-2">
            {/* 期號 */}
            <div className="space-y-2">
              <Label htmlFor="issueNumber">
                期號 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="issueNumber"
                placeholder="例如：42、創刊號、2024年8月號"
                {...register("issueNumber")}
              />
              <p className="text-xs text-muted-foreground">
                照封面登錄，但數字就寫數字：「42」不寫成「No.42」「Vol.42」「第42期」，
                顯示時會自動補成「第 42 期」。沒有數字的照原樣寫，例如「創刊號」「試刊號」
                「新春合併號」「2024年8月號」
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
            <div className="space-y-2 @md:col-span-2">
              <Controller
                name="altNumbers"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label>其他編號</Label>
                    <CommaListInput
                      placeholder="以逗號分隔（例如：2014 02, HK VOL 308, 1月30日號）"
                      value={field.value}
                      format={formatStringList}
                      parse={parseStringList}
                      onChange={field.onChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      同一期封面／版權頁上並存的其他編號。期號欄放最主要的那個（有總號就放總號），
                      其餘如期別、港版卷號、日期發行號放這裡
                    </p>
                  </div>
                )}
              />
            </div>

            {/* 永久短碼 */}
            {code && (
              <div className="space-y-2 @md:col-span-2">
                <Label>永久短碼</Label>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
                    /i/{code}
                  </code>
                  <CopyButton code={code} />
                </div>
                <p className="text-xs text-muted-foreground">
                  自動產生、不會變動。雜誌改名或網址代號改動時，這條連結仍然到得了本期
                </p>
              </div>
            )}

            {/* 出版日期 */}
            <div className="space-y-2">
              <Label htmlFor="publishDate">出版日期</Label>
              <Input
                id="publishDate"
                placeholder="1999-05-20、1999-05、1999、1999-22"
                {...register("publishDate")}
              />
              <p className="text-xs text-muted-foreground">
                知道多少寫多少：年、年-月、年-月-日；季別用 21 春、22 夏、23 秋、24 冬。
                查不到就留空——本期在刊內的位置由排序決定，不必為了填滿欄位捏一個日期
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
            <div className="space-y-2 @md:col-span-2">
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
            <div className="space-y-2 @md:col-span-2">
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

            {/* 完備。只有 ADMIN 看得到這一格 */}
            {canMarkComplete && (
              <div className="space-y-2 @md:col-span-2">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-primary"
                    {...register("complete")}
                  />
                  <span>
                    <span className="font-medium">資料完備</span>
                    <span className="block text-xs text-muted-foreground">
                      這一期該有的資料都有了，不必再回頭看。之後只要這一期或它的目錄被改動，
                      標記會轉為「完備・已變更」，等著重新確認
                    </span>
                  </span>
                </label>
              </div>
            )}

            {/* 備註 */}
            <div className="space-y-2 @md:col-span-2">
              <Label htmlFor="notes">備註</Label>
              <Textarea
                id="notes"
                placeholder="其他備註資訊..."
                rows={3}
                {...register("notes")}
              />
            </div>
          </div>

          {/* Only from lg, where the sidebar exists: below that the page
              scrolls as a whole and a pinned row would float over the fields. */}
          <div
            className={
              stickyActions
                ? "flex gap-4 pt-4 lg:sticky lg:bottom-0 lg:-mx-5 lg:border-t lg:bg-card lg:px-5 lg:py-4"
                : "flex gap-4 pt-4"
            }
          >
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
