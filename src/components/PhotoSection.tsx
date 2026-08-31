"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronDown, ChevronUp, Eye, EyeOff, Loader2, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { downscaleImage } from "@/lib/downscale-image";
import { MAX_UPLOAD_BYTES } from "@/lib/image-policy";
import { uploadErrorMessage } from "@/lib/upload-error";

export interface PhotoRow {
  id: string;
  url: string;
  caption: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  isPublic: boolean;
}

interface PhotoSectionProps {
  /** 掛點，二擇一——與 Photo 的資料模型一致。 */
  owner: { magazineId: string } | { issueId: string };
  photos: PhotoRow[];
  description: string;
}

/**
 * 額外圖片的編輯區：網路上看到人分享的、網拍截下來的，以及原本的藏書照。
 *
 * 每張圖存在自己的一列，改一個欄位就送一次，不跟著雜誌／單期的表單走——圖掛得到
 * 兩種對象，跟著表單走就要在兩個表單各寫一份陣列 diff。代價是沒有「取消」，與
 * 目錄頁編輯的手感一致。
 */
export function PhotoSection({ owner, photos, description }: PhotoSectionProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 正在編輯的說明與來源。存檔或離開欄位才送出，不是每打一個字送一次。 */
  const [drafts, setDrafts] = useState<Record<string, Partial<PhotoRow>>>({});

  const onDrop = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setIsUploading(true);
      setError(null);
      try {
        for (const file of files) {
          const upload = await downscaleImage(file, "photos");
          if (upload.size > MAX_UPLOAD_BYTES) {
            throw new Error(`${file.name} 太大，請先縮小至 4.5MB 以下再上傳`);
          }
          const form = new FormData();
          form.append("file", upload);
          form.append("folder", "photos");
          const uploaded = await fetch("/api/upload", { method: "POST", body: form });
          if (!uploaded.ok) throw new Error(await uploadErrorMessage(uploaded));
          const { url } = await uploaded.json();

          const created = await fetch("/api/photos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...owner, url }),
          });
          if (!created.ok) {
            const data = await created.json().catch(() => null);
            throw new Error(data?.error || "建立圖片失敗");
          }
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "上傳失敗");
      } finally {
        setIsUploading(false);
      }
    },
    [owner, router]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp", ".gif"] },
    disabled: isUploading,
  });

  async function patch(id: string, data: Partial<PhotoRow>) {
    setError(null);
    const response = await fetch(`/api/photos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error || "儲存失敗");
      return;
    }
    router.refresh();
  }

  async function remove(photo: PhotoRow) {
    if (!confirm("確定刪除這張圖？")) return;
    setError(null);
    const response = await fetch(`/api/photos/${photo.id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("刪除失敗");
      return;
    }
    router.refresh();
  }

  /** 上下移一格。整批圖通常只有幾張，拖曳的機械成本換不到什麼。 */
  async function move(index: number, by: -1 | 1) {
    const next = [...photos];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setError(null);
    const response = await fetch("/api/photos/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoIds: next.map((p) => p.id) }),
    });
    if (!response.ok) {
      setError("排序失敗");
      return;
    }
    router.refresh();
  }

  /** 草稿裡的值優先，沒動過就顯示資料庫裡的。 */
  function value<K extends "caption" | "sourceName" | "sourceUrl">(
    photo: PhotoRow,
    field: K
  ): string {
    const draft = drafts[photo.id]?.[field];
    return (draft ?? photo[field] ?? "") as string;
  }

  function edit(id: string, field: string, next: string) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [field]: next } }));
  }

  /** 離開欄位才送，而且只在真的改了的時候。 */
  function commit(photo: PhotoRow, field: "caption" | "sourceName" | "sourceUrl") {
    const next = value(photo, field).trim();
    if (next === (photo[field] ?? "")) return;
    patch(photo.id, { [field]: next || null });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>圖片</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {photos.length > 0 && (
          <ul className="space-y-3">
            {photos.map((photo, index) => (
              <li key={photo.id} className="flex gap-3 rounded-md border p-3">
                <Image
                  src={photo.url}
                  alt={photo.caption ?? "額外圖片"}
                  width={96}
                  height={128}
                  unoptimized
                  className="h-24 w-auto shrink-0 rounded object-contain"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <Textarea
                    value={value(photo, "caption")}
                    onChange={(e) => edit(photo.id, "caption", e.target.value)}
                    onBlur={() => commit(photo, "caption")}
                    placeholder="說明。看不出期號的圖，推測寫在這裡"
                    rows={2}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={value(photo, "sourceName")}
                      onChange={(e) => edit(photo.id, "sourceName", e.target.value)}
                      onBlur={() => commit(photo, "sourceName")}
                      placeholder="來源，如露天拍賣、巴哈姆特哈啦板"
                    />
                    <Input
                      value={value(photo, "sourceUrl")}
                      onChange={(e) => edit(photo.id, "sourceUrl", e.target.value)}
                      onBlur={() => commit(photo, "sourceUrl")}
                      placeholder="來源網址"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    來源留空＝本站藏品，公開頁就不標來源。
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={photo.isPublic ? "已公開，點擊改為不公開" : "未公開，點擊改為公開"}
                    onClick={() => patch(photo.id, { isPublic: !photo.isPublic })}
                  >
                    {photo.isPublic ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="上移"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="下移"
                    disabled={index === photos.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="刪除"
                    onClick={() => remove(photo)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* 只上傳，不收「輸入圖片網址」：網拍商品下架連結就死，而佐證圖的意義
            正是它得留得住。出處記在來源欄，圖存自家的 Blob。 */}
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50",
            isUploading && "pointer-events-none opacity-50"
          )}
        >
          <input {...getInputProps()} />
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">上傳中...</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                {isDragActive ? "放開以上傳" : "拖曳圖片至此，或點擊選擇檔案（可多選）"}
              </p>
              <p className="text-xs text-muted-foreground">
                新增的圖預設不公開，確認來路後再按眼睛圖示放出來
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
