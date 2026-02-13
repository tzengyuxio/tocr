import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

interface IssueCardProps {
  issue: {
    id: string;
    coverImage: string | null;
    issueNumber: string;
    title?: string | null;
    publishDate: Date | string;
    _count: { articles: number };
  };
  magazineId: string;
  magazineName?: string;
}

export function IssueCard({ issue, magazineId, magazineName }: IssueCardProps) {
  return (
    <Link href={`/magazines/${magazineId}/issues/${issue.id}`}>
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        {issue.coverImage ? (
          <img
            src={issue.coverImage}
            alt={issue.issueNumber}
            className="aspect-[3/4] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[3/4] w-full items-center justify-center bg-muted">
            <BookOpen className="h-10 w-10 text-muted-foreground/50" />
          </div>
        )}
        <CardContent className="space-y-0.5 p-2.5">
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
              {format(new Date(issue.publishDate), "yyyy/MM/dd", {
                locale: zhTW,
              })}
            </span>
            <span>{issue._count.articles} 篇</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
