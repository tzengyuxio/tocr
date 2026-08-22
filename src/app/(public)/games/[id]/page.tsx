export const revalidate = 60;

import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { decodeParam, resolveSlugParam } from "@/lib/slug-lookup";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, FileText, SquarePen } from "lucide-react";
import { formatTaipei } from "@/lib/datetime";
import { auth } from "@/lib/auth";
import { Breadcrumb } from "@/components/Breadcrumb";
import { formatEdtf } from "@/lib/edtf";
import { CategoryChip } from "@/components/chips";
import { CoverPlaceholder } from "@/components/CoverPlaceholder";
import { pageOpenGraph } from "@/lib/og";
import { formatIssueNumber } from "@/lib/issue-number";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: param } = await params;
  const found = await resolveSlugParam("game", param);
  if (!found) return { title: "遊戲詳情" };

  const game = await prisma.game.findUnique({
    where: { id: found.id },
    select: {
      name: true,
      description: true,
      coverImage: true,
      _count: { select: { articleGames: true } },
    },
  });
  if (!game) return { title: "遊戲詳情" };

  const description =
    // 空字串也算沒有——資料庫裡那欄常常是 ""，`??` 接不住。
    game.description || `這款遊戲在 ${game._count.articleGames} 篇雜誌文章裡出現過`;

  return {
    title: game.name,
    description,
    openGraph: pageOpenGraph({
      title: game.name,
      description,
      image: game.coverImage,
    }),
  };
}

export default async function GameDetailPage({ params }: PageProps) {
  const { id: param } = await params;

  // 網址上是 slug；舊的 cuid 連結還在外面流傳，所以認出來就永久轉址。
  const found = await resolveSlugParam("game", param);
  if (!found) notFound();
  // encodeURIComponent 不能省：Location header 只吃 ASCII，中文 slug 直接放
  // 進去會讓 Node 丟 ERR_INVALID_CHAR，整頁變成 500。
  if (decodeParam(param) !== found.slug) {
    permanentRedirect(`/games/${encodeURIComponent(found.slug)}`);
  }
  const id = found.id;

  const session = await auth();
  const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR";

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      articleGames: {
        orderBy: {
          article: {
            issue: {
              // Nulls last: an issue with no stated date has no place on a
              // timeline, and Postgres would otherwise sort them first here.
              publishSort: { sort: "desc", nulls: "last" },
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

  if (!game) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb items={[{ label: "遊戲", href: "/games" }, { label: game.name }]} />
      {/* 遊戲資訊 */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row">
        {game.coverImage ? (
          <Image
            src={game.coverImage}
            alt={game.name}
            width={144}
            height={192}
            unoptimized
            className="h-48 w-36 rounded-lg object-cover shadow-lg"
          />
        ) : (
          <CoverPlaceholder kind="game" className="w-36 rounded-lg shadow-lg" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{game.name}</h1>
            {canEdit && (
              <Link
                href={`/admin/games/${id}`}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="編輯此遊戲"
              >
                <SquarePen className="h-4 w-4" />
              </Link>
            )}
          </div>
          {game.nameOriginal && (
            <p className="mt-1 text-lg text-muted-foreground">
              {game.nameOriginal}
            </p>
          )}
          {game.nameEn && game.nameEn !== game.nameOriginal && (
            <p className="text-muted-foreground">{game.nameEn}</p>
          )}
          {/* 落選的譯名與消歧義前的裸名，跟期刊頁的別名同一種寫法 */}
          {game.aliases.length > 0 && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {game.aliases.join(" / ")}
            </p>
          )}

          <div className="mt-4 space-y-2 text-sm">
            {game.releaseDate && (
              <p className="flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">發售日期：</span>
                {formatTaipei(game.releaseDate, "yyyy 年 M 月 d 日")}
              </p>
            )}
            {game.developer && (
              <p>
                <span className="text-muted-foreground">開發商：</span>
                {game.developer}
              </p>
            )}
            {game.publisher && (
              <p>
                <span className="text-muted-foreground">發行商：</span>
                {game.publisher}
              </p>
            )}
          </div>

          {game.platforms.length > 0 && (
            <div className="mt-4">
              <span className="text-sm text-muted-foreground">平台：</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {game.platforms.map((p) => (
                  <Badge key={p} variant="outline">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {game.genres.length > 0 && (
            <div className="mt-3">
              <span className="text-sm text-muted-foreground">類型：</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {game.genres.map((g) => (
                  <Badge key={g} variant="secondary">
                    {g}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {game.description && (
            <p className="mt-4 text-muted-foreground">{game.description}</p>
          )}
        </div>
      </div>

      {/* 相關文章 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            相關文章
            <span className="text-base font-normal text-muted-foreground">
              （共 {game.articleGames.length} 篇）
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {game.articleGames.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              尚無相關文章
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* 期刊與單期併成一欄，形狀沿用 /admin/issues。這一欄要回答的是
                          「哪一本的哪一期」，那本來就是一件事；而拆成兩欄時，左邊那個
                          連到期刊首頁的連結幫不上忙——來到這頁的人要找的是這一期。 */}
                      <TableHead>刊期</TableHead>
                      <TableHead>出版日期</TableHead>
                      <TableHead>文章標題</TableHead>
                      <TableHead>分類</TableHead>
                      <TableHead>頁碼</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {game.articleGames.map((ag) => (
                      <TableRow key={ag.id}>
                        <TableCell>
                          <Link
                            href={`/magazines/${ag.article.issue.magazine.slug}/issues/${encodeURIComponent(ag.article.issue.slug)}`}
                            className="hover:underline"
                          >
                            {ag.article.issue.magazine.name}{" "}
                            <span className="font-semibold">
                              {formatIssueNumber(ag.article.issue.issueNumber)}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatEdtf(ag.article.issue.publishDate)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{ag.article.title}</div>
                          {ag.article.subtitle && (
                            <div className="text-sm text-muted-foreground">
                              {ag.article.subtitle}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {ag.article.category ? (
                            <CategoryChip category={ag.article.category} />
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {ag.article.pageStart || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="divide-y md:hidden">
                {game.articleGames.map((ag) => (
                  <div key={ag.id} className="py-3">
                    <div className="font-medium">{ag.article.title}</div>
                    {ag.article.subtitle && (
                      <div className="text-sm text-muted-foreground">{ag.article.subtitle}</div>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <Link
                        href={`/magazines/${ag.article.issue.magazine.slug}/issues/${encodeURIComponent(ag.article.issue.slug)}`}
                        className="hover:underline"
                      >
                        {ag.article.issue.magazine.name}{" "}
                        {formatIssueNumber(ag.article.issue.issueNumber)}
                      </Link>
                      <span>·</span>
                      <span>{formatEdtf(ag.article.issue.publishDate)}</span>
                      {ag.article.pageStart && <span>· p.{ag.article.pageStart}</span>}
                    </div>
                    {ag.article.category && (
                      <CategoryChip category={ag.article.category} className="mt-1 text-xs" />
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
