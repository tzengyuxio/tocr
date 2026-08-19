import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { formatEdtf } from "@/lib/edtf";
import { formatIssueNumber } from "@/lib/issue-number";

interface IssueCardProps {
  issue: {
    id: string;
    slug: string;
    coverImage: string | null;
    issueNumber: string;
    title?: string | null;
    publishDate: string;
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
          <div className="flex aspect-[3/4] w-full min-h-0 items-center justify-center bg-muted">
            <BookOpen className="h-10 w-10 text-muted-foreground/50" />
          </div>
        )}
        <CardContent className="space-y-0.5 !p-2.5">
          {magazineName && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {magazineName}
            </p>
          )}
          <p className="font-medium text-sm line-clamp-1">
            {formatIssueNumber(issue.issueNumber)}
          </p>
          {issue.title && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {issue.title}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
            <span>
              {formatEdtf(issue.publishDate)}
            </span>
            <span>{issue._count.articles} 篇</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
