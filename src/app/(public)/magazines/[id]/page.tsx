export const revalidate = 60;

import type { Metadata } from "next";
import { Fragment } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { resolveSlugParam } from "@/lib/slug-lookup";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isVerifiedIssue } from "@/lib/issue-complete";
import { formatEdtf } from "@/lib/edtf";
import { Badge } from "@/components/ui/badge";
import { IssueCard } from "@/components/IssueCard";
import { IssueBrowseBar } from "@/components/magazine/IssueBrowseBar";
import {
  MagazineGallery,
} from "@/components/magazine/MagazineGallery";
import { buildMagazineGallery } from "@/lib/magazine-gallery";
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
import { formatIssueNumber } from "@/lib/issue-number";
import { sortTitlePeriods, splitIssuesByPeriod } from "@/lib/magazine-title";
import { JsonLd } from "@/components/JsonLd";
import { periodicalJsonLd } from "@/lib/structured-data";
import { getSiteOrigin } from "@/lib/site-origin";
import { pageOpenGraph } from "@/lib/og";
import { magazineSubtitle } from "@/lib/magazine-browse";
import { splitLinks } from "@/lib/linkify";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string; sort?: string; dir?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: param } = await params;
  const found = await resolveSlugParam("magazine", param);
  if (!found) return { title: "雜誌詳情" };

  const magazine = await prisma.magazine.findUnique({
    where: { id: found.id },
    select: { name: true, description: true, logoImage: true },
  });
  if (!magazine) return { title: "雜誌詳情" };

  return {
    title: magazine.name,
    ...(magazine.description ? { description: magazine.description } : {}),
    openGraph: pageOpenGraph({
      title: magazine.name,
      description: magazine.description,
      image: magazine.logoImage,
    }),
  };
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
  const direction = parseIssueDirection(dirParam, sort);

  // 網址上是 slug；舊的 cuid 連結還在外面流傳，所以認出來就永久轉址。
  const found = await resolveSlugParam("magazine", param);
  if (!found) notFound();
  if (param !== found.slug) permanentRedirect(`/magazines/${found.slug}`);
  const id = found.id;

  const session = await auth();
  const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR";

  const magazine = await prisma.magazine.findUnique({
    where: { id },
    include: {
      titles: {
        select: {
          id: true,
          title: true,
          logoImage: true,
          startIssue: { select: { order: true } },
        },
      },
      // 未公開的圖濾在這裡，不是濾在畫面上：濾在畫面上等於把還沒確認來路的
      // 網址一起送到瀏覽器。
      photos: {
        where: { isPublic: true },
        orderBy: { order: "asc" },
        select: { url: true, caption: true, sourceName: true, sourceUrl: true },
      },
    },
  });

  if (!magazine) {
    notFound();
  }

  // The issues are fetched separately now that the filter narrows them: the
  // counts have to cover the whole magazine even when the list does not, so
  // they cannot come from the rows that came back.
  const [rawIssues, ...filterCounts] = await Promise.all([
    prisma.issue.findMany({
      where: { magazineId: id, ...filter.where },
      orderBy: issueOrderBy(sort, direction),
      include: { _count: { select: { articles: true } } },
    }),
    ...ISSUE_FILTERS.map((option) =>
      prisma.issue.count({ where: { magazineId: id, ...option.where } })
    ),
  ]);

  // 「已校訂」是公開頁認得的兩態之一；後台那三態留在 CompleteBadge。
  const issues = rawIssues.map((issue) => ({
    ...issue,
    isVerified: isVerifiedIssue(issue),
  }));

  const counts = Object.fromEntries(
    ISSUE_FILTERS.map((option, index) => [option.value, filterCounts[index]])
  );
  const total = counts.all;

  // 刊名沿革。頁首那行要涵蓋整段歷史，所以另撈全部期算各時期的期號範圍——
  // 上面的 issues 已被篩選（預設只看有封面的），不能拿來當歷史。
  const sortedTitles = sortTitlePeriods(magazine.titles);
  const historySegments = sortedTitles.length
    ? splitIssuesByPeriod(
        sortedTitles,
        await prisma.issue.findMany({
          where: { magazineId: id },
          select: { order: true, issueNumber: true },
          orderBy: { order: "asc" },
        })
      )
    : [];
  const historyParts = historySegments.map((segment) => {
    const first = formatIssueNumber(segment.issues[0].issueNumber);
    const last = formatIssueNumber(
      segment.issues[segment.issues.length - 1].issueNumber
    );
    return {
      // 錨點編號與下方區段、/magazines 的時期卡同一套；null 首段（titles
      // 沒建齊）沒有對應區段可跳。
      seq: segment.period ? sortedTitles.indexOf(segment.period) + 1 : 0,
      label: `${segment.period?.title ?? magazine.name}（${
        first === last ? first : `${first}－${last}`
      }）`,
    };
  });

  // 期列表只在預設的刊期順序下分時期區段；改排序或方向後時期會交錯，退回平列表。
  const issueSegments =
    sortedTitles.length && sort.value === "order" && direction === "asc"
      ? splitIssuesByPeriod(sortedTitles, issues)
      : null;

  // Only five magazines have a masthead on file, and an empty column beside the
  // details reads as a page that failed to load. The earliest issue's cover
  // stands in: it answers the same question -- what did this magazine look like
  // -- and the note beneath says which of the two a reader is seeing.
  //
  // Borrowed, not copied: the picture keeps living on the issue. Uploading a
  // second copy up here is how the same photograph came to be stored twice.
  const standIn =
    magazine.logoImage || magazine.titles.some((t) => t.logoImage)
      ? null
      : await prisma.issue.findFirst({
          where: { magazineId: id, coverImage: { not: null } },
          orderBy: { order: "asc" },
          select: { issueNumber: true, coverImage: true },
        });

  // The masthead leads and the shelf photographs follow it in the same frame.
  // They used to hang under the details, which grew the page by a band of
  // mostly-empty space: a masthead is wide and short, so the column beside the
  // details is short, and the photographs added height that bought nothing.
  const gallery = buildMagazineGallery({
    name: magazine.name,
    logoImage: magazine.logoImage,
    photos: magazine.photos,
    titles: magazine.titles,
    standIn: standIn?.coverImage
      ? {
          url: standIn.coverImage,
          note: `${formatIssueNumber(standIn.issueNumber)} 封面`,
        }
      : null,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 歷任刊名也進 alternateName，搜尋引擎才把舊名連回這條刊系。 */}
      <JsonLd
        data={periodicalJsonLd(getSiteOrigin(), {
          ...magazine,
          aliases: [
            ...magazine.aliases,
            ...sortedTitles
              .map((t) => t.title)
              .filter((t) => t !== magazine.name),
          ],
        })}
      />
      <Breadcrumb items={[{ label: "雜誌", href: "/magazines" }, { label: magazine.name }]} />

      {/* 期刊資訊。刊頭與詳細資料左右並列，兩欄等高——刊頭原本是頂上一條 96px
          的橫幅，那個高度撐不起這頁唯一的一張圖。 */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-stretch md:gap-8">
        {gallery.images.length > 0 && (
          <>
            <MagazineGallery
              images={gallery.images}
              initialIndex={gallery.initialIndex}
              name={magazine.name}
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
                title="編輯此雜誌"
              >
                <SquarePen className="h-4 w-4" />
              </Link>
            )}
          </div>
          {magazineSubtitle(magazine.nameParallel, magazine.sourceTitle) && (
            <p className="mt-1 text-lg text-muted-foreground">
              {magazineSubtitle(magazine.nameParallel, magazine.sourceTitle)}
            </p>
          )}
          {magazine.aliases && magazine.aliases.length > 0 && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {magazine.aliases.join(" / ")}
            </p>
          )}
          {historyParts.length > 0 && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              刊名沿革：
              {historyParts.map((part, index) => (
                <Fragment key={part.seq}>
                  {index > 0 && " → "}
                  {/* 只在預設排序有區段可跳；其他排序下這個錨點不存在，
                      點了不動，比整行不給連結好。 */}
                  {part.seq > 0 ? (
                    <a
                      href={`#period-${part.seq}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {part.label}
                    </a>
                  ) : (
                    part.label
                  )}
                </Fragment>
              ))}
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
            // whitespace-pre-line 讓分段顯示得出來（同 Issue.notes 的寫法），
            // splitLinks 讓寫在描述裡的出處點得開——考證來源常常是一條網址。
            <p className="mt-4 whitespace-pre-line text-muted-foreground">
              {splitLinks(magazine.description).map((segment, i) =>
                segment.type === "link" ? (
                  <a
                    key={i}
                    href={segment.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {segment.value}
                  </a>
                ) : (
                  segment.value
                )
              )}
            </p>
          )}
        </div>
      </div>

      {/* 單期列表 */}
      <div>
        {/* The controls share the heading's line rather than taking one of
            their own; they wrap under it only when the row runs out of width. */}
        <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-3">
          <h2 className="text-2xl font-bold">
            單期列表
            <span className="ml-2 text-lg font-normal text-muted-foreground">
              {/* 查到這本刊總共出過幾期就一起講，讀者才知道站上收了多大一塊；
                  查不到的刊什麼都不加。有兩個數字時開頭改說「收錄」——並排著
                  「已知 120 期」，「共 92 期」會被讀成這本刊只出了 92 期。 */}
              （{magazine.knownIssueCount ? "收錄" : "共"} {total} 期
              {magazine.knownIssueCount && `・已知 ${magazine.knownIssueCount} 期`}
              {/* Only when the list really is shorter: 軟體世界 has a cover
                  for all 201, and 「共 201 期，顯示 201 期」 reads like a bug. */}
              {issues.length !== total && `，顯示 ${issues.length} 期`}
              ）
            </span>
          </h2>

          {/* 出處跟著數字走：列表頁只掛得上 tooltip（手機碰不到），這裡有空間就
              寫出來——「已知 24 期」是外部查來的，讀者該看得到它哪來的。 */}
          {magazine.knownIssueCount && magazine.knownIssueCountSource && (
            <p className="basis-full text-xs text-muted-foreground">
              已知期數來源：{magazine.knownIssueCountSource}
            </p>
          )}

          {/* A rule, not just space: the heading's trailing 「（共 N 期）」 is the
              same grey and nearly the same size as the 篩選 label, so 96px of
              gap still read as one continuous string. Hidden once the row
              wraps -- a divider at the start of a line means nothing. */}
          {total > 0 && (
            <div
              aria-hidden
              className="hidden h-5 w-px shrink-0 self-center bg-border sm:block"
            />
          )}

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
        ) : issueSegments ? (
          // 依刊名時期分區段。錨點編號跟著時期在沿革中的次序（與 /magazines
          // 的時期卡同一套）；scroll-mt 讓跳轉後的段首不被 sticky header 蓋住。
          <div className="space-y-8">
            {issueSegments.map((segment) => {
              const seq = segment.period
                ? sortedTitles.indexOf(segment.period) + 1
                : 0;
              return (
                <section
                  key={segment.period?.id ?? "before-first"}
                  id={seq > 0 ? `period-${seq}` : undefined}
                  className="scroll-mt-20"
                >
                  {/* 帶底色的橫條，讓時代的分界一眼掃得出來，不只是一行字。 */}
                  <h3 className="mb-3 rounded-md bg-muted/70 px-3 py-2 text-lg font-semibold">
                    {segment.period?.title ?? magazine.name}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {formatIssueNumber(segment.issues[0].issueNumber)}
                      {segment.issues.length > 1 &&
                        ` － ${formatIssueNumber(
                          segment.issues[segment.issues.length - 1].issueNumber
                        )}`}
                    </span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3 sm:[grid-template-columns:repeat(auto-fill,182px)]">
                    {segment.issues.map((issue) => (
                      <IssueCard
                        key={issue.id}
                        issue={issue}
                        magazineSlug={magazine.slug}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
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
