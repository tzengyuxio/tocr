export const revalidate = 60;

import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { decodeParam, resolveIssueParam, resolveSlugParam } from "@/lib/slug-lookup";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, SquarePen } from "lucide-react";
import { auth } from "@/lib/auth";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CategoryChip, GameChip, TagChip } from "@/components/chips";
import { IssueImages } from "@/components/issue/IssueImages";
import { formatEdtf } from "@/lib/edtf";
import { formatIssueNumber } from "@/lib/issue-number";
import { JsonLd } from "@/components/JsonLd";
import { publicationIssueJsonLd } from "@/lib/structured-data";
import { getSiteOrigin } from "@/lib/site-origin";
import { pageOpenGraph } from "@/lib/og";

interface PageProps {
  params: Promise<{ id: string; issueId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: magazineParam, issueId: issueParam } = await params;
  const magazine = await resolveSlugParam("magazine", magazineParam);
  if (!magazine) return { title: "單期詳情" };

  const found = await resolveIssueParam(magazine.id, issueParam);
  if (!found) return { title: "單期詳情" };

  const issue = await prisma.issue.findUnique({
    where: { id: found.id },
    select: {
      issueNumber: true,
      title: true,
      publishDate: true,
      coverImage: true,
      magazine: { select: { name: true } },
    },
  });
  if (!issue) return { title: "單期詳情" };

  const name = `${issue.magazine.name} ${formatIssueNumber(issue.issueNumber)}`;
  // 貼出去的那一行要讓人知道是哪一期、什麼時候的，以及這期在講什麼。
  const description = [formatEdtf(issue.publishDate), issue.title]
    .filter(Boolean)
    .join("｜");

  return {
    title: name,
    description,
    openGraph: pageOpenGraph({
      title: name,
      description,
      image: issue.coverImage,
    }),
  };
}

export default async function IssueDetailPage({ params }: PageProps) {
  const { id: magazineParam, issueId: issueParam } = await params;

  // 兩段各自解析，任一段不是 canonical 就一次轉到正確的網址。舊的 cuid 連結還在
  // 外面流傳，而單期那段還多收期號——拿著實體雜誌的人讀到的是封底的期號。
  const magazine = await resolveSlugParam("magazine", magazineParam);
  if (!magazine) notFound();

  const found = magazine && (await resolveIssueParam(magazine.id, issueParam));
  if (!found) notFound();

  if (magazineParam !== magazine.slug || decodeParam(issueParam) !== found.slug) {
    // encodeURIComponent 不能省：中文 slug（創刊號）直接放進 Location header 會
    // 讓 Node 丟 ERR_INVALID_CHAR，整頁變成 500。
    permanentRedirect(
      `/magazines/${magazine.slug}/issues/${encodeURIComponent(found.slug)}`
    );
  }
  const id = magazine.id;
  const issueId = found.id;

  const session = await auth();
  const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR";

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      magazine: true,
      articles: {
        orderBy: { sortOrder: "asc" },
        include: {
          articleGames: {
            include: {
              game: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
          articleTags: {
            include: {
              tag: {
                select: { id: true, name: true, type: true, slug: true },
              },
            },
          },
        },
      },
    },
  });

  if (!issue || issue.magazineId !== id) {
    notFound();
  }

  // A one-line strip rather than a labelled row each: an issue often knows only
  // its date, and three rows of mostly-absent facts was what left the header
  // half empty.
  const meta = [
    formatEdtf(issue.publishDate),
    issue.pageCount ? `${issue.pageCount} 頁` : null,
    issue.price ? `NT$ ${Number(issue.price)}` : null,
  ].filter(Boolean);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* 這一份目錄多半只有這裡有，所以要讓抓取端讀得到它，而不只是人眼看得到。 */}
      <JsonLd
        data={publicationIssueJsonLd(
          getSiteOrigin(),
          issue.magazine,
          issue
        )}
      />
      <Breadcrumb items={[{ label: "雜誌", href: "/magazines" }, { label: issue.magazine.name, href: `/magazines/${issue.magazine.slug}` }, { label: formatIssueNumber(issue.issueNumber) }]} />

      {/* Title block: the cover no longer sets the height, so nothing has to
          fill 256px of space beside it. */}
      <div className="mb-5">
        <div className="flex items-center gap-3">
          {/* The magazine and the issue number together are the title -- a bare
              "96" names nothing on its own. */}
          <h1 className="text-2xl font-bold sm:text-3xl">
            <Link
              href={`/magazines/${issue.magazine.slug}`}
              className="hover:underline"
            >
              {issue.magazine.name}
            </Link>{" "}
            {formatIssueNumber(issue.issueNumber)}
          </h1>
          {canEdit && (
            <Link
              href={`/admin/magazines/${id}/issues/${issueId}`}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="編輯此單期"
            >
              <SquarePen className="h-4 w-4" />
            </Link>
          )}
        </div>
        {issue.title && (
          <p className="mt-1 text-xl text-muted-foreground">{issue.title}</p>
        )}
        {/* 同一期封面上常印著好幾套編號，而標題只放得下一個。手上拿著實體雜誌的人
            讀到的可能正是這裡的其中一個。 */}
        {issue.altNumbers.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            其他編號：{issue.altNumbers.join(" · ")}
          </p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          {meta.join(" · ")}
        </p>
      </div>

      {/* The images stay beside the index they describe, and stay put while it
          scrolls, so a reader can check one against the other. */}
      {/* No items-start: a sticky child can only stay put inside its parent's
          box, and align-items:start shrinks the aside to its own content, so
          the images scrolled away as soon as the index passed their height.
          Stretching the aside to the row's height gives the sticky block the
          whole index to travel down. */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="shrink-0 lg:w-64 xl:w-72">
          {/* 4.5rem clears the sticky 3.5rem header plus the page's own gap.
              A sticky block taller than its scrollport can never reach its own
              bottom, so on a short window this one scrolls inside itself
              rather than dragging the foot of the notes out of reach. */}
          <div className="space-y-4 lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto">
            <IssueImages
              coverImage={issue.coverImage}
              tocImages={issue.tocImages}
              issueNumber={issue.issueNumber}
            />
            {issue.notes && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  本期資訊
                </p>
                {/* The notes are written a fact to a line -- cover subject,
                    inserts, ISBN -- so the breaks carry meaning. */}
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {issue.notes}
                </p>
              </div>
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* 目錄 */}
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                目錄
                <span className="text-sm font-normal text-muted-foreground">
                  （共 {issue.articles.length} 篇文章）
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              {issue.articles.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  尚無文章資料
                </div>
              ) : (
                /* One responsive list rather than a table and a card list. Every
                   column but the page number and the title was empty on most rows
                   -- this issue has no author at all on any of its 14 articles --
                   and the empty cells were what made the list so tall. Chips drop
                   to a second line only when there are any. */
                <ul className="divide-y">
                  {issue.articles.map((article) => {
                    const chips = [
                      ...article.articleGames.map((ag) => ({
                        key: `g-${ag.game.id}`,
                        href: `/games/${ag.game.slug}`,
                        chip: <GameChip name={ag.game.name} />,
                      })),
                      ...article.articleTags.map((at) => ({
                        key: `t-${at.tag.id}`,
                        href: `/tags/${at.tag.slug}`,
                        chip: <TagChip tag={at.tag} />,
                      })),
                    ];
                    const page = article.pageStart
                      ? article.pageEnd && article.pageEnd !== article.pageStart
                        ? `${article.pageStart}-${article.pageEnd}`
                        : `${article.pageStart}`
                      : null;

                    return (
                      <li key={article.id} className="py-2">
                        <div className="flex items-baseline gap-3">
                          <span className="w-14 shrink-0 text-right font-mono text-sm text-muted-foreground">
                            {page ? `p.${page}` : ""}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="font-medium">{article.title}</span>
                            {article.subtitle && (
                              <span className="ml-2 text-sm text-muted-foreground">
                                {article.subtitle}
                              </span>
                            )}
                            {article.authors.length > 0 && (
                              <span className="ml-2 text-sm text-muted-foreground">
                                ／{article.authors.join("、")}
                              </span>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {article.category && (
                              <CategoryChip
                                category={article.category}
                                className="text-xs"
                              />
                            )}
                            {canEdit && (
                              <Link
                                href={`/admin/articles/${article.id}`}
                                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                title="編輯文章"
                              >
                                <SquarePen className="h-3.5 w-3.5" />
                              </Link>
                            )}
                          </div>
                        </div>
                        {chips.length > 0 && (
                          <div className="ml-[4.25rem] mt-1 flex flex-wrap gap-1">
                            {chips.map(({ key, href, chip }) => (
                              <Link
                                key={key}
                                href={href}
                                className="transition-opacity hover:opacity-80"
                              >
                                {chip}
                              </Link>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
