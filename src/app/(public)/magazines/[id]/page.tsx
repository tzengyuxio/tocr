export const revalidate = 60;

import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { resolveSlugParam } from "@/lib/slug-lookup";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEdtf } from "@/lib/edtf";
import { Badge } from "@/components/ui/badge";
import { IssueCard } from "@/components/IssueCard";
import { IssueBrowseBar } from "@/components/magazine/IssueBrowseBar";
import { MagazineLogo } from "@/components/magazine/MagazineLogo";
import {
  ISSUE_FILTERS,
  issueOrderBy,
  parseIssueDirection,
  parseIssueFilter,
  parseIssueSort,
} from "@/lib/issue-browse";
import { SquarePen } from "lucide-react";
import { auth } from "@/lib/auth";
import { Breadcrumb } from "@/components/Breadcrumb";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string; sort?: string; dir?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: param } = await params;
  const found = await resolveSlugParam("magazine", param);
  if (!found) return { title: "期刊詳情" };

  const magazine = await prisma.magazine.findUnique({
    where: { id: found.id },
    select: { name: true },
  });
  return { title: magazine?.name ?? "期刊詳情" };
}

export default async function MagazineDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id: param } = await params;
  const {
    filter: filterParam,
    sort: sortParam,
    dir: dirParam,
  } = await searchParams;
  const filter = parseIssueFilter(filterParam);
  const sort = parseIssueSort(sortParam);
  const direction = parseIssueDirection(dirParam);

  // 網址上是 slug；舊的 cuid 連結還在外面流傳，所以認出來就永久轉址。
  const found = await resolveSlugParam("magazine", param);
  if (!found) notFound();
  if (param !== found.slug) permanentRedirect(`/magazines/${found.slug}`);
  const id = found.id;

  const session = await auth();
  const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR";

  const magazine = await prisma.magazine.findUnique({ where: { id } });

  if (!magazine) {
    notFound();
  }

  // The issues are fetched separately now that the filter narrows them: the
  // counts have to cover the whole magazine even when the list does not, so
  // they cannot come from the rows that came back.
  const [issues, ...filterCounts] = await Promise.all([
    prisma.issue.findMany({
      where: { magazineId: id, ...filter.where },
      orderBy: issueOrderBy(sort, direction),
      include: { _count: { select: { articles: true } } },
    }),
    ...ISSUE_FILTERS.map((option) =>
      prisma.issue.count({ where: { magazineId: id, ...option.where } })
    ),
  ]);

  const counts = Object.fromEntries(
    ISSUE_FILTERS.map((option, index) => [option.value, filterCounts[index]])
  );
  const total = counts[ISSUE_FILTERS[0].value];

  // Only five magazines have a masthead on file, and an empty column beside the
  // details reads as a page that failed to load. The earliest issue's cover
  // stands in: it answers the same question -- what did this magazine look like
  // -- and the note beneath says which of the two a reader is seeing.
  //
  // Borrowed, not copied: the picture keeps living on the issue. Uploading a
  // second copy up here is how the same photograph came to be stored twice.
  const standIn = magazine.logoImage
    ? null
    : await prisma.issue.findFirst({
        where: { magazineId: id, coverImage: { not: null } },
        orderBy: { publishSort: "asc" },
        select: { issueNumber: true, coverImage: true },
      });
  const headerImage = magazine.logoImage ?? standIn?.coverImage ?? null;

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb items={[{ label: "期刊", href: "/magazines" }, { label: magazine.name }]} />

      {/* 期刊資訊。刊頭與詳細資料左右並列，兩欄等高——刊頭原本是頂上一條 96px
          的橫幅，那個高度撐不起這頁唯一的一張圖。 */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-stretch md:gap-8">
        {headerImage && (
          <>
            <MagazineLogo
              src={headerImage}
              name={magazine.name}
              note={standIn ? `${standIn.issueNumber} 封面` : undefined}
            />
            {/* A rule between the two columns, horizontal once they stack. */}
            <hr className="border-t md:h-auto md:border-l md:border-t-0" />
          </>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{magazine.name}</h1>
            {canEdit && (
              <Link
                href={`/admin/magazines/${id}`}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="編輯此期刊"
              >
                <SquarePen className="h-4 w-4" />
              </Link>
            )}
          </div>
          {magazine.nameOriginal && (
            <p className="mt-1 text-lg text-muted-foreground">
              {magazine.nameOriginal}
            </p>
          )}
          {magazine.aliases && magazine.aliases.length > 0 && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {magazine.aliases.join(" / ")}
            </p>
          )}
          <div className="mt-4 space-y-2 text-sm">
            {magazine.publisher && (
              <p>
                <span className="text-muted-foreground">出版社：</span>
                {magazine.publisher}
              </p>
            )}
            {magazine.issn && (
              <p>
                <span className="text-muted-foreground">ISSN：</span>
                {magazine.issn}
              </p>
            )}
            {magazine.foundedDate && (
              <p>
                <span className="text-muted-foreground">創刊日期：</span>
                {formatEdtf(magazine.foundedDate)}
              </p>
            )}
            {magazine.endedDate && (
              <p>
                <span className="text-muted-foreground">停刊日期：</span>
                {formatEdtf(magazine.endedDate)}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">狀態：</span>
              <Badge
                variant={magazine.isActive ? "default" : "secondary"}
                className="ml-1"
              >
                {magazine.isActive ? "發行中" : "已停刊"}
              </Badge>
            </p>
          </div>
          {magazine.description && (
            <p className="mt-4 text-muted-foreground">{magazine.description}</p>
          )}
          {magazine.photos.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs text-muted-foreground">藏書照</p>
              <div className="flex flex-wrap gap-2">
                {magazine.photos.map((photo) => (
                  /* eslint-disable-next-line @next/next/no-img-element -- a
                     thumbnail strip of arbitrarily-shaped photographs;
                     next/image would need dimensions this data lacks. */
                  <img
                    key={photo}
                    src={photo}
                    alt={`${magazine.name} 藏書照`}
                    className="h-20 w-28 rounded border object-cover"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 單期列表 */}
      <div>
        {/* The controls share the heading's line rather than taking one of
            their own; they wrap under it only when the row runs out of width. */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <h2 className="text-2xl font-bold">
            單期列表
            <span className="ml-2 text-lg font-normal text-muted-foreground">
              （共 {total} 期
              {filter.value !== ISSUE_FILTERS[0].value &&
                `，顯示 ${issues.length} 期`}
              ）
            </span>
          </h2>

          {total > 0 && (
            <IssueBrowseBar
              basePath={`/magazines/${magazine.slug}`}
              filter={filter}
              sort={sort}
              direction={direction}
              counts={counts}
            />
          )}
        </div>

        {issues.length === 0 ? (
          <div className="rounded-lg border p-8 text-center">
            <p className="text-muted-foreground">
              {total === 0 ? "尚無單期資料" : "沒有符合這個篩選的單期"}
            </p>
          </div>
        ) : (
          // Fixed tracks: the covers keep their own proportions now, so the
          // column width is the only thing holding the shelf in line, and a
          // fixed one keeps every issue the same width whatever the viewport.
          // 182px, not 180: the card's 1px border sits outside the image, and
          // it is the image that should measure 180.
          //
          // Two equal columns below sm instead, because auto-fill counts tracks
          // by their width: 182px + gap does not go twice into a 390px phone,
          // and the shelf would drop to a single column.
          <div className="grid grid-cols-2 gap-3 sm:[grid-template-columns:repeat(auto-fill,182px)]">
            {issues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                magazineSlug={magazine.slug}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
