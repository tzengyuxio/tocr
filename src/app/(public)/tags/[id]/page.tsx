import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tags, ArrowLeft, FileText } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

const TAG_TYPE_LABELS: Record<string, string> = {
  GENERAL: "一般",
  PERSON: "人物",
  EVENT: "活動",
  SERIES: "系列",
  COMPANY: "公司",
  PLATFORM: "平台",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TagDetailPage({ params }: PageProps) {
  const { id } = await params;

  const tag = await prisma.tag.findUnique({
    where: { id },
    include: {
      articleTags: {
        orderBy: {
          article: {
            issue: {
              publishDate: "desc",
            },
          },
        },
        include: {
          article: {
            include: {
              issue: {
                select: {
                  id: true,
                  issueNumber: true,
                  publishDate: true,
                  magazine: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!tag) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button asChild variant="ghost" className="mb-6">
        <Link href="/tags">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回標籤列表
        </Link>
      </Button>

      {/* 標籤資訊 */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Tags className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-3xl font-bold">{tag.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="outline">{TAG_TYPE_LABELS[tag.type]}</Badge>
              <span className="text-muted-foreground">
                {tag.articleTags.length} 篇相關文章
              </span>
            </div>
          </div>
        </div>
        {tag.description && (
          <p className="mt-4 text-muted-foreground">{tag.description}</p>
        )}
      </div>

      {/* 相關文章 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            相關文章
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tag.articleTags.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              尚無相關文章
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>期刊</TableHead>
                  <TableHead>期數</TableHead>
                  <TableHead>出版日期</TableHead>
                  <TableHead>文章標題</TableHead>
                  <TableHead>分類</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tag.articleTags.map((at) => (
                  <TableRow key={at.id}>
                    <TableCell>
                      <Link
                        href={`/magazines/${at.article.issue.magazine.id}`}
                        className="hover:underline"
                      >
                        {at.article.issue.magazine.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/magazines/${at.article.issue.magazine.id}/issues/${at.article.issue.id}`}
                        className="hover:underline"
                      >
                        {at.article.issue.issueNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(
                        new Date(at.article.issue.publishDate),
                        "yyyy/MM/dd",
                        { locale: zhTW }
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{at.article.title}</div>
                      {at.article.subtitle && (
                        <div className="text-sm text-muted-foreground">
                          {at.article.subtitle}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {at.article.category ? (
                        <Badge variant="outline">{at.article.category}</Badge>
                      ) : (
                        "-"
                      )}
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
