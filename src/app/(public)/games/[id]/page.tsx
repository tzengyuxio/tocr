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
import { Calendar, FileText, SquarePen } from "lucide-react";
import { formatTaipei } from "@/lib/datetime";
import { auth } from "@/lib/auth";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CoverPlaceholder } from "@/components/CoverPlaceholder";
import { pageOpenGraph } from "@/lib/og";
import { ArticleListTable } from "@/components/ArticleListTable";
import {
  articleOrderBy,
  parseArticleDirection,
  parseArticleSort,
} from "@/lib/article-listing";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; dir?: string }>;
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

export default async function GameDetailPage({ params, searchParams }: PageProps) {
  const { id: param } = await params;
  const { sort: sortParam, dir: dirParam } = await searchParams;
  const sort = parseArticleSort(sortParam);
  const direction = parseArticleDirection(dirParam, sort);

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
        orderBy: articleOrderBy(sort, direction),
        include: {
          article: {
            include: {
              issue: {
                select: {
                  id: true,
                  issueNumber: true,
                  slug: true,
                  publishDate: true,
                  coverImage: true,
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
            <ArticleListTable
              rows={game.articleGames}
              sort={sort}
              direction={direction}
              basePath={`/games/${encodeURIComponent(found.slug)}`}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
