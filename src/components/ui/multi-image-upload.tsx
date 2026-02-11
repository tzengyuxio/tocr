"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  label?: string;
  description?: string;
  className?: string;
}

export function MultiImageUpload({
  value,
  onChange,
  folder = "uploads",
  label,
  description,
  className,
}: MultiImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setIsUploading(true);
      setError(null);

      try {
        const uploadedUrls: string[] = [];

        for (const file of acceptedFiles) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder", folder);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "上傳失敗");
          }

          const data = await response.json();
          uploadedUrls.push(data.url);
        }

        onChange([...value, ...uploadedUrls]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "上傳失敗");
      } finally {
        setIsUploading(false);
      }
    },
    [folder, onChange, value]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp", ".gif"],
    },
    disabled: isUploading,
  });

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange([...value, urlInput.trim()]);
      setUrlInput("");
      setShowUrlInput(false);
    }
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}

      {/* 已上傳圖片縮圖 */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url, index) => (
            <div key={`${url}-${index}`} className="relative inline-block">
              <img
                src={url}
                alt={`已上傳 ${index + 1}`}
                className="h-32 w-auto rounded-lg border object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -right-2 -top-2 h-6 w-6"
                onClick={() => handleRemove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Dropzone */}
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
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">上傳中...</p>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              {isDragActive ? "放開以上傳" : "拖曳圖片至此，或點擊選擇檔案（可多選）"}
            </p>
            <p className="text-xs text-muted-foreground">
              支援 JPEG, PNG, WebP, GIF（最大 10MB）
            </p>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">或</span>
        {showUrlInput ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              placeholder="輸入圖片網址"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1"
            />
            <Button type="button" size="sm" onClick={handleUrlSubmit}>
              確認
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowUrlInput(false)}
            >
              取消
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="p-0"
            onClick={() => setShowUrlInput(true)}
          >
            <ImageIcon className="mr-1 h-4 w-4" />
            輸入圖片網址
          </Button>
        )}
      </div>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
