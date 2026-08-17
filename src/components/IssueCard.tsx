import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { formatEdtf } from "@/lib/edtf";

interface IssueCardProps {
  issue: {
    id: string;
    coverImage: string | null;
    issueNumber: string;
    title?: string | null;
    publishDate: string;
    _count: { articles: number };
  };
  magazineSlug: string;
  magazineName?: string;
}

export function IssueCard({ issue, magazineSlug, magazineName }: IssueCardProps) {
  return (
    <Link href={`/magazines/${magazineSlug}/issues/${issue.id}`}>
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md gap-0 py-0">
        {issue.coverImage ? (
          // object-contain, not cover: a magazine cover is mostly masthead and
          // cover lines, and cropping to fill the frame cuts the text off.
          // The frame keeps its 3:4 shape so the grid stays even.
          <div className="flex aspect-[3/4] w-full items-center justify-center bg-muted">
            <Image
              src={issue.coverImage}
              alt={issue.issueNumber}
              width={400}
              height={560}
              unoptimized
              className="max-h-full w-auto max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex aspect-[3/4] w-full items-center justify-center bg-muted">
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
            {issue.issueNumber}
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
