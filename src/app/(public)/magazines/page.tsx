export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

export default async function MagazinesPage() {
  const magazines = await prisma.magazine.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { issues: true },
      },
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">期刊列表</h1>
        <p className="mt-2 text-muted-foreground">
          瀏覽所有收錄的遊戲雜誌
        </p>
      </div>

      {magazines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-xl font-semibold">尚無期刊資料</h2>
          <p className="mt-2 text-muted-foreground">
            資料建置中，敬請期待
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {magazines.map((magazine) => (
            <Link key={magazine.id} href={`/magazines/${magazine.id}`}>
              <Card className="h-full transition-shadow hover:shadow-lg">
                <CardHeader className="pb-3">
                  {magazine.coverImage ? (
                    <img
                      src={magazine.coverImage}
                      alt={magazine.name}
                      className="mb-3 h-48 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="mb-3 flex h-48 items-center justify-center rounded-lg bg-muted">
                      <BookOpen className="h-16 w-16 text-muted-foreground/50" />
                    </div>
                  )}
                  <CardTitle className="line-clamp-1">{magazine.name}</CardTitle>
                  {magazine.nameEn && (
                    <CardDescription className="line-clamp-1">
                      {magazine.nameEn}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {magazine.publisher || "未知出版社"}
                    </span>
                    <Badge variant={magazine.isActive ? "default" : "secondary"}>
                      {magazine._count.issues} 期
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
