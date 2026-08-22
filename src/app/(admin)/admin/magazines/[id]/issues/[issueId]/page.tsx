import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { IssueForm } from "@/components/magazine/IssueForm";
import { isSessionAdmin } from "@/lib/require-editor";
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
import { formatTaipei } from "@/lib/datetime";
import { formatIssueNumber } from "@/lib/issue-number";

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
          articleTags: {
            include: { tag: { select: { id: true, name: true, type: true } } },
          },
        },
      },
    },
  });

  if (!issue || issue.magazineId !== id) {
    notFound();
  }

  // A stored result means the recognition step is already done and what is left
  // is the review, so the button should not read like it starts from scratch.
  const savedOcr = await prisma.ocrRecord.findFirst({
    where: { issueId },
    orderBy: { processedAt: "desc" },
    select: { processedAt: true },
  });

  const formData = {
    id: issue.id,
    magazineId: issue.magazineId,
    issueNumber: issue.issueNumber,
    altNumbers: issue.altNumbers,
    slug: issue.slug,
    volumeNumber: issue.volumeNumber,
    title: issue.title,
    publishDate: issue.publishDate,
    coverImage: issue.coverImage,
    tocImages: issue.tocImages,
    pageCount: issue.pageCount,
    price: issue.price ? Number(issue.price) : null,
    notes: issue.notes,
    tocReviewed: issue.tocReviewedAt !== null,
    complete: issue.completeAt !== null && issue.completeStaleAt === null,
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
          {issue.magazine.name} - {formatIssueNumber(issue.issueNumber)}
        </h1>
      </div>
      {/* Two jobs on one page: the fields are set once, the article list is
          gone over line by line. Side by side, so reviewing the list never
          scrolls the form off -- and the form keeps its own scroll rather than
          pushing the list down. The public issue page uses the same sticky
          column. Below lg they stack, as before. */}
      {/* No items-start, and the sticky block sits inside the column rather
          than being the column: align-items:start shrinks a column to its own
          content, and a sticky child can only stay put inside its parent's box.
          Stretched, it has the whole article list to travel down. Same shape as
          the public issue page. */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="shrink-0 lg:w-[22rem] xl:w-96">
          {/* h-14 header plus the main element's p-6. Taller than the window it
              scrolls inside itself, so the save button stays reachable. */}
          <div className="lg:sticky lg:top-0 lg:max-h-[calc(100vh-6.5rem)] lg:overflow-y-auto">
            <IssueForm
              magazineId={issue.magazineId}
              magazineName={issue.magazine.name}
              code={issue.code}
              initialData={formData}
              mode="edit"
              canMarkComplete={await isSessionAdmin()}
              completeStale={issue.completeAt !== null && issue.completeStaleAt !== null}
              stickyActions
            />
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
          {/* AI 辨識區塊 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>AI 目錄辨識</CardTitle>
                <CardDescription>
                  {savedOcr
                    ? `已於 ${formatTaipei(savedOcr.processedAt, "yyyy/MM/dd HH:mm")} 辨識完成`
                    : "上傳目錄頁圖片，使用 AI 自動辨識文章資訊"}
                </CardDescription>
              </div>
              <Button asChild>
                <Link href={`/admin/ocr?issueId=${issue.id}`}>
                  <ScanText className="mr-2 h-4 w-4" />
                  {savedOcr ? "重新辨識" : "開始辨識"}
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {issue.tocImages.length > 0 ? (
                <div className="flex items-center gap-4">
                  {issue.tocImages.map((url, index) => (
                    /* eslint-disable-next-line @next/next/no-img-element -- an
                       admin-only thumbnail strip; the optimizer buys little here. */
                    <img
                      key={index}
                      src={url}
                      alt={`目錄頁 ${index + 1}`}
                      className="h-32 rounded border object-contain"
                    />
                  ))}
                  <p className="text-sm text-muted-foreground">
                    {savedOcr
                      ? `已設定 ${issue.tocImages.length} 張目錄頁圖片，文章已在下方的文章列表，可對照目錄頁複查`
                      : `已設定 ${issue.tocImages.length} 張目錄頁圖片，點擊「開始辨識」使用 AI 分析`}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  尚未上傳目錄頁圖片，請先在「編輯單期」表單上傳目錄頁圖片，或直接前往辨識頁面上傳
                </p>
              )}
            </CardContent>
          </Card>

          {/* 文章列表 */}
          <ArticleListClient
            articles={issue.articles}
            issueId={issue.id}
            magazineId={id}
            tocImages={issue.tocImages}
            tocReviewed={issue.tocReviewedAt !== null}
          />
        </div>
      </div>
    </div>
  );
}
