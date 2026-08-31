import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatEdtf } from "@/lib/edtf";
import { formatIssueNumber } from "@/lib/issue-number";
import { CoverPlaceholder } from "@/components/CoverPlaceholder";
import { VerifiedMark } from "@/components/magazine/VerifiedMark";

interface IssueCardProps {
  issue: {
    id: string;
    slug: string;
    coverImage: string | null;
    issueNumber: string;
    title?: string | null;
    publishDate: string | null;
    /** 資料核對過了。三態收成兩態的地方見 lib/issue-complete.ts。 */
    isVerified?: boolean;
    _count: { articles: number };
  };
  magazineSlug: string;
  magazineName?: string;
}

/**
 * One issue as the object it was: the scan keeps its own proportions and the
 * card has square corners, because these are photographs of physical magazines
 * and a rounded corner reads as damage to the object rather than as styling.
 *
 * The cost is that a row of cards no longer lines up along the bottom of the
 * covers -- issues really were different shapes.
 */
export function IssueCard({ issue, magazineSlug, magazineName }: IssueCardProps) {
  return (
    <Link href={`/magazines/${magazineSlug}/issues/${encodeURIComponent(issue.slug)}`}>
      <Card className="h-full gap-0 overflow-hidden rounded-none py-0 transition-shadow hover:shadow-md">
        {issue.coverImage ? (
          // No frame to fight with: the width comes from the grid column and
          // the height follows the scan.
          <Image
            src={issue.coverImage}
            alt={formatIssueNumber(issue.issueNumber)}
            width={400}
            height={560}
            unoptimized
            className="h-auto w-full bg-muted"
          />
        ) : (
          // No scan: the placeholder keeps a 3:4 frame, so a gap still reads as
          // a magazine-shaped hole rather than as a squashed card.
          <CoverPlaceholder kind="issue" className="w-full min-h-0" />
        )}
        <CardContent className="space-y-0.5 !p-2.5">
          {magazineName && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {magazineName}
            </p>
          )}
          {/* 標記跟期號同一行：底下那行只有 182px 寬，日期與篇數已經用滿，
              第三個元素會把日期折成兩行。期號短，讓得出這個位置。 */}
          {/* text-sm 掛在這一層而不只在 <p> 上：印的大小是 em，掛在 <p> 裡面的話
              它繼承到的是外層 16px，會比旁邊的期號還大一號。 */}
          <div className="flex items-center gap-1.5 text-sm">
            <p className="min-w-0 flex-1 truncate font-medium">
              {formatIssueNumber(issue.issueNumber)}
            </p>
            {/* 卡片的字本來就小（14px），照標題那個比例會縮到看不出形狀。 */}
            <VerifiedMark verified={issue.isVerified ?? false} sizeEm={0.9} />
          </div>
          {issue.title && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {issue.title}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
            <span>
              {/* Said outright rather than left blank: the gap between the
                  issue number and the article count reads as a layout fault. */}
              {formatEdtf(issue.publishDate) || "日期不詳"}
            </span>
            <span>{issue._count.articles} 篇</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
