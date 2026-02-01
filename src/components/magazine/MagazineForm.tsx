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
import {
  magazineCreateSchema,
  type MagazineCreateInput,
} from "@/lib/validators/magazine";
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
      nameEn: initialData?.nameEn || "",
      publisher: initialData?.publisher || "",
      issn: initialData?.issn || "",
      description: initialData?.description || "",
      coverImage: initialData?.coverImage || "",
      foundedDate: initialData?.foundedDate || null,
      endedDate: initialData?.endedDate || null,
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
          <CardTitle>{mode === "create" ? "新增期刊" : "編輯期刊"}</CardTitle>
          <CardDescription>
            {mode === "create"
              ? "填寫期刊的基本資訊"
              : "修改期刊的基本資訊"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* 期刊名稱 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                期刊名稱 <span className="text-red-500">*</span>
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

            {/* 英文名稱 */}
            <div className="space-y-2">
              <Label htmlFor="nameEn">英文名稱</Label>
              <Input
                id="nameEn"
                placeholder="例如：Famitsu"
                {...register("nameEn")}
              />
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
              <Input id="foundedDate" type="date" {...register("foundedDate")} />
            </div>

            {/* 停刊日期 */}
            <div className="space-y-2">
              <Label htmlFor="endedDate">停刊日期</Label>
              <Input id="endedDate" type="date" {...register("endedDate")} />
            </div>

            {/* 封面圖片 */}
            <div className="space-y-2 md:col-span-2">
              <Controller
                name="coverImage"
                control={control}
                render={({ field }) => (
                  <ImageUpload
                    label="封面圖片"
                    value={field.value || ""}
                    onChange={field.onChange}
                    folder="magazines"
                    description="期刊的代表封面圖片"
                  />
                )}
              />
            </div>

            {/* 描述 */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                placeholder="簡述期刊的特色與歷史..."
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
              {mode === "create" ? "建立期刊" : "儲存變更"}
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
