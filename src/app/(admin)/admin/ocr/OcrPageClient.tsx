"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Combobox } from "@/components/ui/combobox";
import { OcrUploader } from "@/components/ocr/OcrUploader";
import { OcrResultEditor } from "@/components/ocr/OcrResultEditor";
import { ArrowLeft, History, Loader2, RefreshCw } from "lucide-react";
import type { OcrResult, OcrArticleResult } from "@/services/ai/ocr.interface";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { formatEdtf } from "@/lib/edtf";

interface Issue {
  id: string;
  issueNumber: string;
  publishDate: string;
  tocImages: string[];
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
    publishDate: string;
    tocImages: string[];
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
  const [markedReviewed, setMarkedReviewed] = useState(false);
  // When the shown result came from a stored record rather than a fresh run.
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  const selectedMagazine = magazines.find((m) => m.id === selectedMagazineId);
  const selectedIssue = selectedMagazine?.issues.find(
    (i) => i.id === selectedIssueId
  );

  const magazineOptions = magazines.map((m) => ({
    value: m.id,
    label: `${m.name}（${m.issues.length} 期）`,
  }));

  const issueOptions = (selectedMagazine?.issues ?? []).map((issue) => ({
    value: issue.id,
    label: `${issue.issueNumber}（${formatEdtf(issue.publishDate)}）${issue.tocImages.length > 0 ? ` [${issue.tocImages.length} 張目錄圖]` : ""}`,
  }));

  /**
   * Load the issue's last stored result, so arriving from 單期複查 lands on the
   * review step instead of asking for another recognition run.
   */
  const loadSavedResult = useCallback(async (issueId: string) => {
    setIsLoadingSaved(true);
    try {
      const response = await fetch(`/api/issues/${issueId}/ocr`);
      if (!response.ok) return; // 404 just means nothing has been recognised yet
      const data = await response.json();
      setOcrResult(data.result as OcrResult);
      setLoadedAt(data.processedAt);
    } catch {
      // Falling back to the uploader is the right failure mode here.
    } finally {
      setIsLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    if (selectedIssueId) loadSavedResult(selectedIssueId);
  }, [selectedIssueId, loadSavedResult]);

  const handleMagazineChange = (value: string) => {
    setSelectedMagazineId(value);
    setSelectedIssueId("");
    setOcrResult(null);
    setLoadedAt(null);
  };

  const handleIssueChange = (value: string) => {
    setSelectedIssueId(value);
    setOcrResult(null);
    setLoadedAt(null);
  };

  const handleOcrResult = (result: OcrResult) => {
    setOcrResult(result);
    setLoadedAt(null);
    setIsSaved(false);
  };

  const handleRerun = () => {
    setOcrResult(null);
    setLoadedAt(null);
  };

  const handleSave = async (articles: OcrArticleResult[]) => {
    if (!selectedIssueId) {
      throw new Error("請先選擇單期");
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
          suggestedTags: article.suggestedTags?.map((t) =>
            typeof t === "string" ? { name: t, type: "GENERAL" } : t
          ),
        })),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "儲存失敗");
    }

    setMarkedReviewed(!!data.markedReviewed);
    setIsSaved(true);

    // 3 秒後跳轉到單期編輯頁
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
              返回單期編輯
            </Link>
          </Button>
        )}
      </div>

      {/* 期刊/單期選擇 */}
      <Card>
        <CardHeader>
          <CardTitle>選擇目標單期</CardTitle>
          <CardDescription>
            辨識結果將儲存到所選單期的文章列表中
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>期刊</Label>
              <Combobox
                options={magazineOptions}
                value={selectedMagazineId}
                onValueChange={handleMagazineChange}
                placeholder="選擇期刊"
                searchPlaceholder="搜尋期刊..."
                emptyMessage="找不到期刊"
              />
            </div>

            <div className="space-y-2">
              <Label>單期</Label>
              <Combobox
                options={issueOptions}
                value={selectedIssueId}
                onValueChange={handleIssueChange}
                placeholder={selectedMagazineId ? "選擇單期" : "請先選擇期刊"}
                searchPlaceholder="搜尋單期..."
                emptyMessage="找不到單期"
                disabled={!selectedMagazineId}
              />
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
            <span className="font-medium">
              文章已成功儲存{markedReviewed ? "，本期已標記為完成複查" : ""}！
            </span>
          </div>
          <p className="mt-1 text-sm">正在跳轉至單期編輯頁面...</p>
        </div>
      )}

      {/* 已存的辨識結果 */}
      {loadedAt && ocrResult && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-4">
          <div className="flex items-center gap-2 text-sm">
            <History className="h-4 w-4 text-muted-foreground" />
            <span>
              載入了{" "}
              <strong>
                {format(new Date(loadedAt), "yyyy/MM/dd HH:mm", { locale: zhTW })}
              </strong>{" "}
              的辨識結果，共 {ocrResult.articles.length} 篇，可直接複查後儲存
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRerun}>
            <RefreshCw className="mr-2 h-4 w-4" />
            重新辨識
          </Button>
        </div>
      )}

      {/* OCR 上傳或結果 */}
      {isLoadingSaved ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          讀取先前的辨識結果...
        </div>
      ) : !ocrResult ? (
        <OcrUploader
          issueId={selectedIssueId}
          initialImageUrls={selectedIssue?.tocImages}
          onResult={handleOcrResult}
        />
      ) : (
        <OcrResultEditor
          result={ocrResult}
          issueId={selectedIssueId}
          tocImages={selectedIssue?.tocImages || []}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
