import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { IssueForm } from "@/components/magazine/IssueForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, FileText, ScanText } from "lucide-react";

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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>文章列表</CardTitle>
            <CardDescription>共 {issue.articles.length} 篇文章</CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link href={`/admin/articles/new?issueId=${issue.id}`}>
              <Plus className="mr-2 h-4 w-4" />
              手動新增文章
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {issue.articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">尚無文章資料</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                使用 AI 辨識功能自動產生，或手動新增文章
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">頁碼</TableHead>
                  <TableHead>標題</TableHead>
                  <TableHead>作者</TableHead>
                  <TableHead>分類</TableHead>
                  <TableHead>相關遊戲</TableHead>
                  <TableHead className="w-[80px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issue.articles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-mono text-sm">
                      {article.pageStart}
                      {article.pageEnd && article.pageEnd !== article.pageStart
                        ? `-${article.pageEnd}`
                        : ""}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{article.title}</div>
                      {article.subtitle && (
                        <div className="text-sm text-muted-foreground">
                          {article.subtitle}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {article.authors.length > 0
                        ? article.authors.join(", ")
                        : "-"}
                    </TableCell>
                    <TableCell>{article.category || "-"}</TableCell>
                    <TableCell>
                      {article.articleGames.length > 0
                        ? article.articleGames
                            .map((ag) => ag.game.name)
                            .join(", ")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/admin/articles/${article.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
