export const revalidate = 60;

import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { decodeParam, resolveIssueParam, resolveSlugParam } from "@/lib/slug-lookup";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isVerifiedIssue } from "@/lib/issue-complete";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, SquarePen } from "lucide-react";
import { auth } from "@/lib/auth";
import { Breadcrumb } from "@/components/Breadcrumb";
import { IssueImages } from "@/components/issue/IssueImages";
import { IssueTocList } from "@/components/issue/IssueTocList";
import { VerifiedMark } from "@/components/magazine/VerifiedMark";
import { ExternalLinkList } from "@/components/ExternalLinkList";
import { formatEdtf } from "@/lib/edtf";
import { formatIssueNumber } from "@/lib/issue-number";
import { JsonLd } from "@/components/JsonLd";
import { publicationIssueJsonLd } from "@/lib/structured-data";
import { titleForIssue } from "@/lib/magazine-title";
import { getSiteOrigin } from "@/lib/site-origin";
import { pageOpenGraph } from "@/lib/og";
import { splitLinks, shortenUrl } from "@/lib/linkify";
import { publicSourceUrl, withPublicSourceUrls } from "@/lib/photo-source";

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
      order: true,
      magazine: {
        select: {
          name: true,
          titles: {
            select: { title: true, startIssue: { select: { order: true } } },
          },
        },
      },
    },
  });
  if (!issue) return { title: "單期詳情" };

  // 用這一期當時的刊名稱呼它，不是今天的通行名。
  const magazineName = titleForIssue(
    issue.magazine.titles,
    issue.order,
    issue.magazine.name
  );
  const name = `${magazineName} ${formatIssueNumber(issue.issueNumber)}`;
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

/**
 * 「封面資訊」box 裡 credit 那一列的 label 與值。
 *
 * `coverCredit` 預設是繪者、直接寫名字（`曾正忠`）；不是繪者時角色詞寫在值裡
 * （`攝影：陳某`），見 data-conventions 的「封面資訊」。原本 label 一律寫「封面」，
 * 但整個 box 已經叫「封面資訊」，再說一次封面等於什麼都沒說；自帶角色詞的值還會
 * 讀成「封面：攝影：陳某」兩個冒號。所以把值裡的角色詞提上來當 label，沒有角色詞
 * 的那些就是繪者——欄位與寫法都不用動，只有讀法變了。
 */
function coverCreditRole(credit: string): string {
  const i = credit.indexOf("：");
  return i > 0 ? credit.slice(0, i) : "繪者";
}

function coverCreditName(credit: string): string {
  const i = credit.indexOf("：");
  return i > 0 ? credit.slice(i + 1) : credit;
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
      magazine: {
        include: {
          titles: {
            select: { title: true, startIssue: { select: { order: true } } },
          },
        },
      },
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
      links: {
        orderBy: { order: "asc" },
        select: { id: true, site: true, url: true, label: true },
      },
      // 未公開的濾在查詢層，同 /magazines/[id]。
      photos: {
        where: { isPublic: true },
        orderBy: { order: "asc" },
        select: { url: true, caption: true, sourceName: true, sourceUrl: true },
      },
    },
  });

  if (!issue || issue.magazineId !== id) {
    notFound();
  }

  // A one-line strip rather than a labelled row each: an issue often knows only
  // its date, and three rows of mostly-absent facts was what left the header
  // half empty.
  // 這一期當時的刊名——標題與麵包屑都用它，1999 年的期不掛今天的名字。
  const magazineName = titleForIssue(
    issue.magazine.titles,
    issue.order,
    issue.magazine.name
  );

  const meta = [
    formatEdtf(issue.publishDate),
    issue.pageCount ? `${issue.pageCount} 頁` : null,
    issue.price ? `NT$ ${Number(issue.price)}` : null,
  ].filter(Boolean);

  // 相鄰的期用 `order` 找，不是期號加一：期號排不出前後（vol.01、試刊號、
  // 70+71 之間沒有大小），而 order 本來就是這本刊的順序。也不能用 order ± 1
  // ——合併號各佔一格，站上又不是每一期都建了，序號中間有洞。
  const [previousIssue, nextIssue] = await Promise.all([
    prisma.issue.findFirst({
      where: { magazineId: issue.magazineId, order: { lt: issue.order } },
      orderBy: { order: "desc" },
      select: { slug: true, issueNumber: true },
    }),
    prisma.issue.findFirst({
      where: { magazineId: issue.magazineId, order: { gt: issue.order } },
      orderBy: { order: "asc" },
      select: { slug: true, issueNumber: true },
    }),
  ]);
  const issueHref = (slug: string) =>
    `/magazines/${issue.magazine.slug}/issues/${encodeURIComponent(slug)}`;

  // 同一份目錄畫兩個地方：頁面上那張，以及掃描對照視窗的右欄。同一個 element
  // 傳給兩邊，兩邊看到的條目才保證是同一批。代價是 RSC payload 裡這段出現兩次
  // ——視窗關著的時候它不在 DOM 裡（Radix 的 portal 開了才掛），所以只是幾 KB
  // 的傳輸，不是兩份畫面。
  const tocList = <IssueTocList articles={issue.articles} canEdit={canEdit} />;

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
      <Breadcrumb items={[{ label: "雜誌", href: "/magazines" }, { label: magazineName, href: `/magazines/${issue.magazine.slug}` }, { label: formatIssueNumber(issue.issueNumber) }]} />

      {/* Title block: the cover no longer sets the height, so nothing has to
          fill 256px of space beside it. */}
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {/* The magazine and the issue number together are the title -- a bare
              "96" names nothing on its own. */}
          <h1 className="text-2xl font-bold sm:text-3xl">
            <Link
              href={`/magazines/${issue.magazine.slug}`}
              className="hover:underline"
            >
              {magazineName}
            </Link>{" "}
            {formatIssueNumber(issue.issueNumber)}
            {/* 放進 h1 而不是擺在它旁邊：印的大小是 em，擺在外面繼承到的是
                外層的 16px，在 30px 的標題旁永遠不成比例。 */}
            <VerifiedMark verified={isVerifiedIssue(issue)} className="ml-2" />
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
          {/* 同一列置右，不放頁尾：一期一期翻下去的人不該為了下一個連結先捲到底。 */}
          {(previousIssue || nextIssue) && (
            <nav className="ml-auto flex shrink-0 items-center gap-3 text-sm">
              {previousIssue && (
                <Link
                  href={issueHref(previousIssue.slug)}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  ← {formatIssueNumber(previousIssue.issueNumber)}
                </Link>
              )}
              {nextIssue && (
                <Link
                  href={issueHref(nextIssue.slug)}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  {formatIssueNumber(nextIssue.issueNumber)} →
                </Link>
              )}
            </nav>
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
        {/* 16rem/18rem 是圖本身的寬度，多出來的 0.75rem 是下面 pr-3 讓給捲軸的
            那一條。寬度加在 aside 上而不是從圖身上扣，代價由右欄的 flex-1 吸收
            ——目錄那一欄少 12px 看不出來，封面少 12px 看得出來。改 pr-3 時這兩
            個值要跟著動。 */}
        <aside className="shrink-0 lg:w-[16.75rem] xl:w-[18.75rem]">
          {/* 4.5rem clears the sticky 3.5rem header plus the page's own gap.
              A sticky block taller than its scrollport can never reach its own
              bottom, so on a short window this one scrolls inside itself
              rather than dragging the foot of the notes out of reach.
              pr-3 keeps that scrollbar off the cover: the column is exactly as
              wide as the image, so without it the bar sits on the artwork --
              and an overlay scrollbar (the macOS default) is drawn *over* the
              content, so scrollbar-gutter reserves nothing for it. */}
          <div className="space-y-4 lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:pr-3">
            {/* 封面與 photos 的出處網址先過濾：拍賣站只留名字，見 lib/photo-source。 */}
            <IssueImages
              coverImage={issue.coverImage}
              coverSource={{
                name: issue.coverSourceName,
                url: publicSourceUrl(issue.coverSourceUrl),
              }}
              tocImages={issue.tocImages}
              photos={withPublicSourceUrls(issue.photos)}
              magazineName={magazineName}
              issueNumber={issue.issueNumber}
              tocList={tocList}
            />
            {/* 封面資訊：緊接著封面圖，因為它講的就是上面那張圖。三欄都空就
                整段不出現——絕大多數期還沒填，空標題比沒有更吵。
                credit 那一列的 label 讀值決定，見下面的 splitCoverCredit。
                標籤與值之間用全形冒號而不是空白：《電玩通》封面把日本藝人的姓名
                分寫成「水樹 奈奈」，值裡本來就有空白，再用空白當分隔就讀不出
                哪一個是分隔。標籤加粗一階、也從灰色提到前景色——冒號在窄欄裡
                不夠分，而整格都是同一個灰的時候，光加粗看不太出來。 */}
            {(issue.coverGames.length > 0 ||
              issue.coverSubjects.length > 0 ||
              issue.coverCredit) && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  封面資訊
                </p>
                <dl className="space-y-0.5 text-sm text-muted-foreground">
                  {issue.coverGames.length > 0 && (
                    <div className="flex">
                      <dt className="shrink-0 font-semibold text-foreground">遊戲：</dt>
                      <dd className="min-w-0">{issue.coverGames.join("、")}</dd>
                    </div>
                  )}
                  {issue.coverSubjects.length > 0 && (
                    <div className="flex">
                      <dt className="shrink-0 font-semibold text-foreground">人物：</dt>
                      <dd className="min-w-0">{issue.coverSubjects.join("、")}</dd>
                    </div>
                  )}
                  {issue.coverCredit && (
                    <div className="flex">
                      <dt className="shrink-0 font-semibold text-foreground">{coverCreditRole(issue.coverCredit)}：</dt>
                      <dd className="min-w-0">{coverCreditName(issue.coverCredit)}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
            <ExternalLinkList links={issue.links} />
            {issue.notes && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  本期資訊
                </p>
                {/* The notes are written a fact to a line -- cover subject,
                    inserts, ISBN -- so each line becomes its own paragraph and
                    the breaks read as breaks. A source URL is shown shortened
                    and broken mid-word: written out in full it is wider than
                    the sidebar, and the whole page then scrolls sideways. */}
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {issue.notes
                    .split("\n")
                    .filter((paragraph) => paragraph.trim())
                    .map((paragraph, p) => (
                      <p key={p} className="break-words">
                        {splitLinks(paragraph).map((segment, i) =>
                          segment.type === "link" ? (
                            <a
                              key={i}
                              href={segment.value}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline underline-offset-2 hover:text-foreground"
                            >
                              {shortenUrl(segment.value)}
                            </a>
                          ) : (
                            segment.value
                          )
                        )}
                      </p>
                    ))}
                </div>
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
              <IssueTocList articles={issue.articles} canEdit={canEdit} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
