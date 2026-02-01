export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tags } from "lucide-react";

const TAG_TYPE_LABELS: Record<string, string> = {
  GENERAL: "一般",
  PERSON: "人物",
  EVENT: "活動",
  SERIES: "系列",
  COMPANY: "公司",
  PLATFORM: "平台",
};

export default async function TagsPage() {
  const tags = await prisma.tag.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { articleTags: true },
      },
    },
  });

  // 按類型分組
  const tagsByType = tags.reduce(
    (acc, tag) => {
      if (!acc[tag.type]) {
        acc[tag.type] = [];
      }
      acc[tag.type].push(tag);
      return acc;
    },
    {} as Record<string, typeof tags>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">標籤索引</h1>
        <p className="mt-2 text-muted-foreground">
          依照人物、活動、系列等標籤探索相關文章
        </p>
      </div>

      {tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Tags className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-xl font-semibold">尚無標籤資料</h2>
          <p className="mt-2 text-muted-foreground">
            資料建置中，敬請期待
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(tagsByType).map(([type, typeTags]) => (
            <Card key={type}>
              <CardHeader>
                <CardTitle>{TAG_TYPE_LABELS[type] || type}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {typeTags.map((tag) => (
                    <Link key={tag.id} href={`/tags/${tag.id}`}>
                      <Badge
                        variant="outline"
                        className="cursor-pointer px-3 py-1 text-sm transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        {tag.name}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({tag._count.articleTags})
                        </span>
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
