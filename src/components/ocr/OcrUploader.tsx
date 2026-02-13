"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
import { Upload, X, Loader2, Image as ImageIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OcrResult } from "@/services/ai/ocr.interface";

interface OcrUploaderProps {
  issueId?: string;
  initialImageUrls?: string[];
  onResult: (result: OcrResult) => void;
}

export function OcrUploader({
  issueId,
  initialImageUrls,
  onResult,
}: OcrUploaderProps) {
  const [imagePreviews, setImagePreviews] = useState<string[]>(
    initialImageUrls || []
  );
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>(
    initialImageUrls || []
  );
  const [provider, setProvider] = useState("");
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // elapsed time counter during processing
  useEffect(() => {
    if (isProcessing) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isProcessing]);

  // 同步 initialImageUrls 變化（解決切換單期後 prop 變化但 state 不更新的問題）
  useEffect(() => {
    const urls = initialImageUrls || [];
    setImagePreviews(urls);
    setImageUrls(urls);
    setImageFiles([]);
    setError(null);
  }, [initialImageUrls]);

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
    if (acceptedFiles.length === 0) return;

    setError(null);

    const newFiles = [...acceptedFiles];
    setImageFiles((prev) => [...prev, ...newFiles]);

    // 產生預覽
    for (const file of newFiles) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp", ".gif"],
    },
    disabled: isProcessing,
  });

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      const url = urlInput.trim();
      setImagePreviews((prev) => [...prev, url]);
      setImageUrls((prev) => [...prev, url]);
      setUrlInput("");
      setShowUrlInput(false);
      setError(null);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));

    // 判斷此索引對應的是 URL 還是 file
    // previews = [...imageUrls, ...file previews]
    if (index < imageUrls.length) {
      setImageUrls((prev) => prev.filter((_, i) => i !== index));
    } else {
      const fileIndex = index - imageUrls.length;
      setImageFiles((prev) => prev.filter((_, i) => i !== fileIndex));
    }
  };

  const handleProcess = async () => {
    if (imageFiles.length === 0 && imageUrls.length === 0) {
      setError("請先上傳圖片或輸入圖片網址");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();

      // 多圖檔案
      for (const file of imageFiles) {
        formData.append("images", file);
      }

      // 多圖 URL
      if (imageUrls.length > 0) {
        formData.append("imageUrls", JSON.stringify(imageUrls));
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
    setImagePreviews([]);
    setImageFiles([]);
    setImageUrls([]);
    setError(null);
  };

  const hasImages = imagePreviews.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI 目錄辨識
        </CardTitle>
        <CardDescription>
          上傳雜誌目錄頁圖片，AI 將自動辨識並提取文章資訊（可上傳多張）
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* processing overlay */}
        {isProcessing && (
          <div className="rounded-lg border bg-muted/30 p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <Sparkles className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
              <div>
                <p className="text-lg font-medium">AI 正在辨識目錄內容...</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  已經過 {elapsedSeconds} 秒，辨識多張圖片可能需要較長時間，請耐心等候
                </p>
              </div>
              <div className="h-1.5 w-64 overflow-hidden rounded-full bg-muted">
                <div className="h-full animate-[indeterminate_1.5s_ease-in-out_infinite] rounded-full bg-primary" />
              </div>
            </div>
          </div>
        )}

        {/* 圖片預覽區 */}
        {hasImages && !isProcessing && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {imagePreviews.map((src, index) => (
                <div key={`${src.slice(0, 30)}-${index}`} className="relative">
                  <img
                    src={src}
                    alt={`目錄頁 ${index + 1}`}
                    className="h-48 w-auto rounded-lg border object-contain"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -right-2 -top-2 h-6 w-6"
                    onClick={() => handleRemoveImage(index)}
                    disabled={isProcessing}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* 新增更多圖片 */}
            <div
              {...getRootProps()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50",
                isProcessing && "pointer-events-none opacity-50"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="mt-1 text-sm text-muted-foreground">
                新增更多圖片
              </p>
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

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleClear}
                  disabled={isProcessing}
                >
                  清除全部
                </Button>
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
                      開始辨識（{imagePreviews.length} 張）
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 空狀態：Dropzone */}
        {!hasImages && (
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
                  : "拖曳目錄頁圖片至此，或點擊選擇檔案（可多選）"}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
