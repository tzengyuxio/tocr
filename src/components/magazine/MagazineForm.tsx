"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  magazineCreateSchema,
  type MagazineCreateInput,
} from "@/lib/validators/magazine";
import {
  MAGAZINE_CATEGORY_LABELS,
  MAGAZINE_CATEGORY_VALUES,
} from "@/lib/magazine-browse";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface MagazineFormProps {
  initialData?: MagazineCreateInput & { id?: string };
  mode: "create" | "edit";
}

export function MagazineForm({ initialData, mode }: MagazineFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<MagazineCreateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(magazineCreateSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      slug: initialData?.slug || "",
      nameParallel: initialData?.nameParallel || "",
      sourceTitle: initialData?.sourceTitle || "",
      aliases: initialData?.aliases || [],
      publisher: initialData?.publisher || "",
      issn: initialData?.issn || "",
      description: initialData?.description || "",
      logoImage: initialData?.logoImage || "",
      photos: initialData?.photos || [],
      categories: initialData?.categories || [],
      foundedDate: initialData?.foundedDate || "",
      endedDate: initialData?.endedDate || "",
      isActive: initialData?.isActive ?? true,
    },
  });

  const onSubmit = async (data: MagazineCreateInput) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const url =
        mode === "create"
          ? "/api/magazines"
          : `/api/magazines/${initialData?.id}`;
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

      router.push("/admin/magazines");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "發生未知錯誤");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "新增雜誌" : "編輯雜誌"}</CardTitle>
          <CardDescription>
            {mode === "create"
              ? "填寫雜誌的基本資訊"
              : "修改雜誌的基本資訊"}
          </CardDescription>
        </CardHeader>
        {/* @container, not the viewport: this form is a narrow sidebar on the
            magazine page and a wide card on the create page, and the fields
            should follow the space they actually have. */}
        <CardContent className="@container space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="grid gap-6 @md:grid-cols-2">
            {/* 期刊名稱 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                雜誌名稱 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="例如：電玩通"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* 網址代號 */}
            <div className="space-y-2">
              <Label htmlFor="slug">
                網址代號 <span className="text-red-500">*</span>
              </Label>
              <Input id="slug" placeholder="例如：fmt-tw" {...register("slug")} />
              <p className="text-xs text-muted-foreground">
                公開網址用的短代號，只能小寫英數與連字號。已收錄的雜誌沿用
                nostalibrary 的代號；新刊取自英文刊名。改動會讓舊網址失效
              </p>
              {errors.slug && (
                <p className="text-sm text-destructive">{errors.slug.message}</p>
              )}
            </div>

            {/* 並列刊名 */}
            <div className="space-y-2">
              <Label htmlFor="nameParallel">並列刊名</Label>
              <Input
                id="nameParallel"
                placeholder="例如：ACE、TV GAME MAGAZINE"
                {...register("nameParallel")}
              />
              <p className="text-xs text-muted-foreground">
                刊物自己印在封面上的另一語言刊名。填它當招牌用的那個形式，不是最完整的那個——
                《電腦玩家》印過 Amazing Computer Entertainment 但自稱 ACE，這裡填
                ACE，全名放別名
              </p>
            </div>

            {/* 原刊刊名 */}
            <div className="space-y-2">
              <Label htmlFor="sourceTitle">原刊刊名</Label>
              <Input
                id="sourceTitle"
                placeholder="例如：ファミ通"
                {...register("sourceTitle")}
              />
              <p className="text-xs text-muted-foreground">
                只在「本刊整體就是該外刊的中文版」時填。有文章授權不算——《電腦玩家》曾標示
                「PC GAMER 國際中文版」，但它不是那本雜誌，這欄留空
              </p>
            </div>

            {/* 出版社 */}
            <div className="space-y-2">
              <Label htmlFor="publisher">出版社</Label>
              <Input
                id="publisher"
                placeholder="例如：角川出版"
                {...register("publisher")}
              />
            </div>

            {/* ISSN */}
            <div className="space-y-2">
              <Label htmlFor="issn">ISSN</Label>
              <Input
                id="issn"
                placeholder="例如：1234-5678"
                {...register("issn")}
              />
            </div>

            {/* 創刊日期 */}
            <div className="space-y-2">
              <Label htmlFor="foundedDate">創刊日期</Label>
              <Input
                id="foundedDate"
                placeholder="1989-04-08、1989-04、1989、1989-22"
                {...register("foundedDate")}
              />
              <p className="text-xs text-muted-foreground">
                知道多少寫多少：年、年-月、年-月-日；季別用 21 春、22 夏、23 秋、24 冬
              </p>
              {errors.foundedDate && (
                <p className="text-sm text-destructive">
                  {errors.foundedDate.message}
                </p>
              )}
            </div>

            {/* 停刊日期 */}
            <div className="space-y-2">
              <Label htmlFor="endedDate">停刊日期</Label>
              <Input
                id="endedDate"
                placeholder="例如：1970-12"
                {...register("endedDate")}
              />
              {errors.endedDate && (
                <p className="text-sm text-destructive">
                  {errors.endedDate.message}
                </p>
              )}
            </div>

            {/* 別名 */}
            <div className="space-y-2 @md:col-span-2">
              <Controller
                name="aliases"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label>別名</Label>
                    <CommaListInput
                      placeholder="輸入別名，以逗號分隔（例如：ファミ通, fami通）"
                      value={field.value}
                      format={formatStringList}
                      parse={parseStringList}
                      onChange={field.onChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      俗稱、簡稱與並列刊名的其他寫法，以逗號分隔。改名後的刊名請用下方的
                      刊名沿革，並列刊名與原刊各有專屬欄位
                    </p>
                  </div>
                )}
              />
            </div>

            {/* 分類 */}
            <div className="space-y-2 @md:col-span-2">
              <Controller
                name="categories"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label>分類</Label>
                    <div className="flex flex-wrap gap-2">
                      {MAGAZINE_CATEGORY_VALUES.map((category) => {
                        const on = (field.value || []).includes(category);
                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() =>
                              field.onChange(
                                on
                                  ? (field.value || []).filter((c) => c !== category)
                                  : [...(field.value || []), category]
                              )
                            }
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs transition-colors",
                              on
                                ? "border-transparent bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            {MAGAZINE_CATEGORY_LABELS[category]}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      這本刊物報導哪一類遊戲。跨類別的刊可以複選（電玩通後期同時涵蓋主機與線上）
                    </p>
                  </div>
                )}
              />
            </div>

            {/* Logo 圖片 */}
            <div className="space-y-2 @md:col-span-2">
              <Controller
                name="logoImage"
                control={control}
                render={({ field }) => (
                  <ImageUpload
                    label="Logo 圖片"
                    value={field.value || ""}
                    onChange={field.onChange}
                    folder="magazines"
                    description="封面上的刊名字樣，一本一張。改版過的刊選最認得出來的那一版"
                  />
                )}
              />
            </div>

            {/* 藏書照 */}
            <div className="space-y-2 @md:col-span-2">
              <Controller
                name="photos"
                control={control}
                render={({ field }) => (
                  <MultiImageUpload
                    label="藏書照"
                    value={field.value || []}
                    onChange={field.onChange}
                    folder="magazines"
                    description="實體收藏的照片（書背、書櫃、整疊）。單期的封面請放在該期底下，不要放這裡"
                  />
                )}
              />
            </div>

            {/* 描述 */}
            <div className="space-y-2 @md:col-span-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                placeholder="簡述雜誌的特色與歷史..."
                rows={4}
                {...register("description")}
              />
            </div>

            {/* 狀態 */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                className="h-4 w-4 rounded border-gray-300"
                {...register("isActive")}
              />
              <Label htmlFor="isActive" className="font-normal">
                持續發行中
              </Label>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "建立雜誌" : "儲存變更"}
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
