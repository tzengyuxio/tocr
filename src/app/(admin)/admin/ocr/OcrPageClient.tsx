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
import { Combobox } from "@/components/ui/combobox";
import { OcrUploader } from "@/components/ocr/OcrUploader";
import { AlertCircle, ArrowLeft } from "lucide-react";
import type { OcrResult } from "@/services/ai/ocr.interface";
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
  const [error, setError] = useState<string | null>(null);

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

  const handleMagazineChange = (value: string) => {
    setSelectedMagazineId(value);
    setSelectedIssueId("");
    setError(null);
  };

  const handleIssueChange = (value: string) => {
    setSelectedIssueId(value);
    setError(null);
  };

  /** 這期現有的文章數，用來決定要不要先問過再取代。 */
  const countExistingArticles = async () => {
    const res = await fetch(
      `/api/articles?issueId=${encodeURIComponent(selectedIssueId)}&limit=1`
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return data.pagination?.total ?? 0;
  };

  const landArticles = async (result: OcrResult, replaceExisting: boolean) => {
    const response = await fetch("/api/articles/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issueId: selectedIssueId,
        ...(replaceExisting && { replaceExisting: true }),
        articles: result.articles.map((article, index) => ({
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

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "儲存失敗");
    }
  };

  /**
   * 辨識結果直接落地成文章，複查在單期編輯頁進行。以前是先在這裡複查再存，
   * 而那個畫面編的是辨識快照、存的是新文章 -- 複查兩次就多出一整份。
   */
  const handleOcrResult = async (result: OcrResult) => {
    setError(null);
    try {
      const existing = await countExistingArticles();
      if (existing > 0) {
        const proceed = confirm(
          `這期已經有 ${existing} 篇文章。\n\n` +
            "繼續會以這次的辨識結果「取代」它們，既有文章連同標籤與遊戲關聯都會刪除。\n" +
            "取消的話，辨識結果仍留在紀錄裡，之後可以再載入。"
        );
        if (!proceed) return;
      }

      await landArticles(result, existing > 0);
      router.push(
        `/admin/magazines/${selectedMagazineId}/issues/${selectedIssueId}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI 目錄辨識</h2>
          <p className="text-muted-foreground">
            上傳目錄頁圖片，自動辨識文章資訊並寫入該期文章列表
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
            辨識完成後會直接寫入所選單期，並跳到單期編輯頁複查
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

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 p-4 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <OcrUploader
        issueId={selectedIssueId}
        initialImageUrls={selectedIssue?.tocImages}
        onResult={handleOcrResult}
      />
    </div>
  );
}
