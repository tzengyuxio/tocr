"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { TAG_TYPES } from "@/lib/tag-colors";
import { slugify } from "@/lib/slugify";
import { cn } from "@/lib/utils";

export interface TagFormValues {
  name: string;
  slug: string;
  type: string;
  description: string;
}

const EMPTY: TagFormValues = {
  name: "",
  slug: "",
  type: "GENERAL",
  description: "",
};

interface TagFormProps {
  mode: "create" | "edit";
  /** 編輯時必填：要打哪一筆的 PUT。 */
  tagId?: string;
  initialData?: Partial<TagFormValues>;
  /** 對話框裡按鈕靠右並先取消後儲存，頁面上反過來——沿用各自原本的版面。 */
  variant?: "page" | "dialog";
  /** 存好了。呼叫端決定是關對話框、重取清單，還是原地重新整理。 */
  onSaved?: () => void;
  onCancel?: () => void;
}

export function TagForm({
  mode,
  tagId,
  initialData,
  variant = "page",
  onSaved,
  onCancel,
}: TagFormProps) {
  const [values, setValues] = useState<TagFormValues>({ ...EMPTY, ...initialData });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof TagFormValues>(key: K, value: TagFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.name.trim() || !values.slug.trim()) {
      setError("名稱和 Slug 為必填");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(
        mode === "create" ? "/api/tags" : `/api/tags/${tagId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "操作失敗");
      }
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "發生未知錯誤");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label>名稱 *</Label>
          <Input
            value={values.name}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                name: e.target.value,
                // 建立時才自動帶 slug：已經發布的網址不該因為改個錯字就換掉。
                slug: mode === "edit" ? prev.slug : slugify(e.target.value),
              }))
            }
            placeholder="標籤名稱"
          />
        </div>

        <div className="space-y-2">
          <Label>Slug *</Label>
          <Input
            value={values.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="url-friendly-slug"
          />
          <p className="text-xs text-muted-foreground">
            用於 URL，只能包含小寫字母、數字、中日韓文字和連字號
          </p>
        </div>

        <div className="space-y-2">
          <Label>類型</Label>
          <Select value={values.type} onValueChange={(value) => set("type", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAG_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>描述</Label>
          <Input
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="標籤描述（選填）"
          />
        </div>
      </div>

      <div
        className={cn(
          "flex gap-2 pt-4",
          variant === "dialog" ? "justify-end" : "justify-start"
        )}
      >
        {variant === "page" ? (
          <>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "建立標籤" : "儲存變更"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                取消
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "建立" : "儲存"}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
