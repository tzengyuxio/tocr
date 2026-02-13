import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { IssueForm } from "@/components/magazine/IssueForm";
import { ArticleListClient } from "@/components/article/ArticleListClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, ScanText } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string; issueId: string }>;
}

export default async function EditIssuePage({ params }: PageProps) {
  const { id, issueId } = await params;

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      magazine: {
        select: { id: true, name: true },
      },
      articles: {
        orderBy: { sortOrder: "asc" },
        include: {
          articleGames: {
            include: { game: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  if (!issue || issue.magazineId !== id) {
    notFound();
  }

  const formData = {
    id: issue.id,
    magazineId: issue.magazineId,
    issueNumber: issue.issueNumber,
    volumeNumber: issue.volumeNumber,
    title: issue.title,
    publishDate: issue.publishDate,
    coverImage: issue.coverImage,
    tocImages: issue.tocImages,
    pageCount: issue.pageCount,
    price: issue.price ? Number(issue.price) : null,
    notes: issue.notes,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/magazines/${id}`}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">
          {issue.magazine.name} - {issue.issueNumber}
        </h1>
      </div>
      <div className="mx-auto max-w-2xl">
        <IssueForm
          magazineId={issue.magazineId}
          magazineName={issue.magazine.name}
          initialData={formData}
          mode="edit"
        />
      </div>

      {/* AI 辨識區塊 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>AI 目錄辨識</CardTitle>
            <CardDescription>
              上傳目錄頁圖片，使用 AI 自動辨識文章資訊
            </CardDescription>
          </div>
          <Button asChild>
            <Link href={`/admin/ocr?issueId=${issue.id}`}>
              <ScanText className="mr-2 h-4 w-4" />
              開始辨識
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {issue.tocImages.length > 0 ? (
            <div className="flex items-center gap-4">
              {issue.tocImages.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`目錄頁 ${index + 1}`}
                  className="h-32 rounded border object-contain"
                />
              ))}
              <p className="text-sm text-muted-foreground">
                已設定 {issue.tocImages.length} 張目錄頁圖片，點擊「開始辨識」使用 AI 分析
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              尚未上傳目錄頁圖片，請先在上方表單上傳目錄頁圖片，或直接前往辨識頁面上傳
            </p>
          )}
        </CardContent>
      </Card>

      {/* 文章列表 */}
      <ArticleListClient
        articles={issue.articles}
        issueId={issue.id}
        magazineId={id}
      />
    </div>
  );
}
