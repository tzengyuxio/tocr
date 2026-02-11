"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Upload, Loader2, Image as ImageIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OcrResult } from "@/services/ai/ocr.interface";

interface OcrUploaderProps {
  issueId?: string;
  initialImageUrl?: string;
  onResult: (result: OcrResult) => void;
}

export function OcrUploader({
  issueId,
  initialImageUrl,
  onResult,
}: OcrUploaderProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialImageUrl || null
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState(initialImageUrl || "");
  const [provider, setProvider] = useState("");
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);

  useEffect(() => {
    fetch("/api/ocr")
      .then((res) => res.json())
      .then((data) => {
        setAvailableProviders(data.providers || []);
        setProvider(data.default || "claude");
      })
      .catch(() => {
        setProvider("claude");
      });
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setImageFile(file);
    setImageUrl("");
    setError(null);

    // 產生預覽
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp", ".gif"],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  const handleUrlSubmit = () => {
    if (imageUrl.trim()) {
      setImagePreview(imageUrl.trim());
      setImageFile(null);
      setShowUrlInput(false);
      setError(null);
    }
  };

  const handleProcess = async () => {
    if (!imageFile && !imageUrl) {
      setError("請先上傳圖片或輸入圖片網址");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();

      if (imageFile) {
        formData.append("image", imageFile);
      } else if (imageUrl) {
        formData.append("imageUrl", imageUrl);
      }

      formData.append("provider", provider);
      if (issueId) {
        formData.append("issueId", issueId);
      }

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "辨識失敗");
      }

      const data = await response.json();
      onResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "發生未知錯誤");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setImagePreview(null);
    setImageFile(null);
    setImageUrl("");
    setError(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI 目錄辨識
        </CardTitle>
        <CardDescription>
          上傳雜誌目錄頁圖片，AI 將自動辨識並提取文章資訊
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {imagePreview ? (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={imagePreview}
                alt="目錄頁預覽"
                className="max-h-96 w-full rounded-lg border object-contain"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute right-2 top-2"
                onClick={handleClear}
                disabled={isProcessing}
              >
                重新選擇
              </Button>
            </div>

            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label>AI 服務</Label>
                <Select
                  value={provider}
                  onValueChange={setProvider}
                  disabled={isProcessing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude" disabled={!availableProviders.includes("claude")}>
                      Claude (Anthropic)
                    </SelectItem>
                    <SelectItem value="gemini" disabled={!availableProviders.includes("gemini")}>
                      Gemini (Google)
                    </SelectItem>
                    <SelectItem value="openai" disabled={!availableProviders.includes("openai")}>
                      OpenAI
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleProcess}
                disabled={isProcessing}
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    辨識中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    開始辨識
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div
              {...getRootProps()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-center text-muted-foreground">
                {isDragActive
                  ? "放開以上傳圖片"
                  : "拖曳目錄頁圖片至此，或點擊選擇檔案"}
              </p>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                支援 JPEG, PNG, WebP, GIF（最大 10MB）
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">或</span>
              {showUrlInput ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    placeholder="輸入圖片網址"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
