"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { OcrUploader } from "@/components/ocr/OcrUploader";
import { OcrResultEditor } from "@/components/ocr/OcrResultEditor";
import { ArrowLeft, BookOpen } from "lucide-react";
import type { OcrResult, OcrArticleResult } from "@/services/ai/ocr.interface";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

interface Issue {
  id: string;
  issueNumber: string;
  publishDate: Date;
  tocImage: string | null;
  magazine?: {
    id: string;
    name: string;
  };
}

interface Magazine {
  id: string;
  name: string;
  issues: {
    id: string;
    issueNumber: string;
    publishDate: Date;
    tocImage: string | null;
  }[];
}

interface OcrPageClientProps {
  initialIssue: Issue | null;
  magazines: Magazine[];
}

export function OcrPageClient({ initialIssue, magazines }: OcrPageClientProps) {
  const router = useRouter();
  const [selectedMagazineId, setSelectedMagazineId] = useState<string>(
    initialIssue?.magazine?.id || ""
  );
  const [selectedIssueId, setSelectedIssueId] = useState<string>(
    initialIssue?.id || ""
  );
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const selectedMagazine = magazines.find((m) => m.id === selectedMagazineId);
  const selectedIssue = selectedMagazine?.issues.find(
    (i) => i.id === selectedIssueId
  );

  const handleMagazineChange = (value: string) => {
    setSelectedMagazineId(value);
    setSelectedIssueId("");
    setOcrResult(null);
  };

  const handleIssueChange = (value: string) => {
    setSelectedIssueId(value);
    setOcrResult(null);
  };

  const handleOcrResult = (result: OcrResult) => {
    setOcrResult(result);
    setIsSaved(false);
  };

  const handleSave = async (articles: OcrArticleResult[]) => {
    if (!selectedIssueId) {
      throw new Error("請先選擇期數");
    }

    // 批次建立文章
    const response = await fetch("/api/articles/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issueId: selectedIssueId,
        articles: articles.map((article, index) => ({
          title: article.title,
          subtitle: article.subtitle,
          authors: article.authors || [],
          category: article.category,
          pageStart: article.pageStart,
          pageEnd: article.pageEnd,
          summary: article.summary,
          sortOrder: index,
          suggestedGames: article.suggestedGames,
          suggestedTags: article.suggestedTags,
        })),
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "儲存失敗");
    }

    setIsSaved(true);

    // 3 秒後跳轉到期數編輯頁
    setTimeout(() => {
      router.push(
        `/admin/magazines/${selectedMagazineId}/issues/${selectedIssueId}`
      );
    }, 2000);
  };

  const handleCancel = () => {
    setOcrResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI 目錄辨識</h2>
          <p className="text-muted-foreground">
            上傳目錄頁圖片，自動辨識文章資訊
          </p>
        </div>
        {selectedMagazineId && selectedIssueId && (
          <Button asChild variant="outline">
            <Link
              href={`/admin/magazines/${selectedMagazineId}/issues/${selectedIssueId}`}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回期數編輯
            </Link>
          </Button>
        )}
      </div>

      {/* 期刊/期數選擇 */}
      <Card>
        <CardHeader>
          <CardTitle>選擇目標期數</CardTitle>
          <CardDescription>
            辨識結果將儲存到所選期數的文章列表中
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>期刊</Label>
              <Select
                value={selectedMagazineId}
                onValueChange={handleMagazineChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇期刊" />
                </SelectTrigger>
                <SelectContent>
                  {magazines.map((magazine) => (
                    <SelectItem key={magazine.id} value={magazine.id}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        {magazine.name}
                        <Badge variant="secondary" className="ml-2">
                          {magazine.issues.length} 期
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>期數</Label>
              <Select
                value={selectedIssueId}
                onValueChange={handleIssueChange}
                disabled={!selectedMagazineId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      selectedMagazineId ? "選擇期數" : "請先選擇期刊"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {selectedMagazine?.issues.map((issue) => (
                    <SelectItem key={issue.id} value={issue.id}>
                      <div className="flex items-center gap-2">
                        {issue.issueNumber}
                        <span className="text-muted-foreground">
                          (
                          {format(new Date(issue.publishDate), "yyyy/MM/dd", {
                            locale: zhTW,
                          })}
                          )
                        </span>
                        {issue.tocImage && (
                          <Badge variant="outline" className="text-xs">
                            有目錄圖
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 成功訊息 */}
      {isSaved && (
        <div className="rounded-lg bg-green-50 p-4 text-green-800">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">文章已成功儲存！</span>
          </div>
          <p className="mt-1 text-sm">正在跳轉至期數編輯頁面...</p>
        </div>
      )}

      {/* OCR 上傳或結果 */}
      {!ocrResult ? (
        <OcrUploader
          issueId={selectedIssueId}
          initialImageUrl={selectedIssue?.tocImage || undefined}
          onResult={handleOcrResult}
        />
      ) : (
        <OcrResultEditor
          result={ocrResult}
          issueId={selectedIssueId}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
