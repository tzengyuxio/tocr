export const revalidate = 60;

import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { decodeParam, resolveSlugParam } from "@/lib/slug-lookup";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
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
import { Tags, FileText, SquarePen } from "lucide-react";
import { auth } from "@/lib/auth";
import { Breadcrumb } from "@/components/Breadcrumb";
import { formatEdtf } from "@/lib/edtf";
import { CategoryChip, TagTypeChip } from "@/components/chips";
import { formatIssueNumber } from "@/lib/issue-number";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: param } = await params;
  const found = await resolveSlugParam("tag", param);
  if (!found) return { title: "標籤詳情" };

  const tag = await prisma.tag.findUnique({
    where: { id: found.id },
    select: { name: true },
  });
  return { title: tag?.name ?? "標籤詳情" };
}

export default async function TagDetailPage({ params }: PageProps) {
  const { id: param } = await params;

  // 網址上是 slug；舊的 cuid 連結還在外面流傳，所以認出來就永久轉址。
  const found = await resolveSlugParam("tag", param);
  if (!found) notFound();
  // encodeURIComponent 不能省：Location header 只吃 ASCII，中文 slug 直接放
  // 進去會讓 Node 丟 ERR_INVALID_CHAR，整頁變成 500。
  if (decodeParam(param) !== found.slug) {
    permanentRedirect(`/tags/${encodeURIComponent(found.slug)}`);
  }
  const id = found.id;

  const session = await auth();
  const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR";

  const tag = await prisma.tag.findUnique({
    where: { id },
    include: {
      articleTags: {
        orderBy: {
          article: {
            issue: {
              publishSort: "desc",
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
                  slug: true,
                  publishDate: true,
                  magazine: {
                    select: { id: true, name: true, slug: true },
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
      <Breadcrumb items={[{ label: "標籤", href: "/tags" }, { label: tag.name }]} />
      {/* 標籤資訊 */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Tags className="h-8 w-8 text-muted-foreground" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{tag.name}</h1>
              {canEdit && (
                <Link
                  href={`/admin/tags/${id}`}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="編輯此標籤"
                >
                  <SquarePen className="h-4 w-4" />
                </Link>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <TagTypeChip type={tag.type} />
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
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>期刊</TableHead>
                      <TableHead>單期</TableHead>
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
                            href={`/magazines/${at.article.issue.magazine.slug}`}
                            className="hover:underline"
                          >
                            {at.article.issue.magazine.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/magazines/${at.article.issue.magazine.slug}/issues/${encodeURIComponent(at.article.issue.slug)}`}
                            className="hover:underline"
                          >
                            {formatIssueNumber(at.article.issue.issueNumber)}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatEdtf(at.article.issue.publishDate)}
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
                            <CategoryChip category={at.article.category} />
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="divide-y md:hidden">
                {tag.articleTags.map((at) => (
                  <div key={at.id} className="py-3">
                    <div className="font-medium">{at.article.title}</div>
                    {at.article.subtitle && (
                      <div className="text-sm text-muted-foreground">{at.article.subtitle}</div>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <Link href={`/magazines/${at.article.issue.magazine.slug}`} className="hover:underline">
                        {at.article.issue.magazine.name}
                      </Link>
                      <span>·</span>
                      <Link href={`/magazines/${at.article.issue.magazine.slug}/issues/${encodeURIComponent(at.article.issue.slug)}`} className="hover:underline">
                        {formatIssueNumber(at.article.issue.issueNumber)}
                      </Link>
                      <span>·</span>
                      <span>{formatEdtf(at.article.issue.publishDate)}</span>
                    </div>
                    {at.article.category && (
                      <CategoryChip category={at.article.category} className="mt-1 text-xs" />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
