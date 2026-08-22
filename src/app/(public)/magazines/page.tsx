export const revalidate = 60;

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "雜誌列表",
};
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
import { MagazineBrowseBar } from "@/components/magazine/MagazineBrowseBar";
import {
  MAGAZINE_FILTERS,
  magazineOrderBy,
  parseMagazineDirection,
  parseMagazineFilter,
  parseMagazineSort,
} from "@/lib/magazine-browse";

export default async function MagazinesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; sort?: string; dir?: string }>;
}) {
  const params = await searchParams;
  const filter = parseMagazineFilter(params.filter);
  const sort = parseMagazineSort(params.sort);
  const direction = parseMagazineDirection(params.dir, sort);

  const [magazines, counts] = await Promise.all([
    prisma.magazine.findMany({
      where: filter.where,
      orderBy: magazineOrderBy(sort, direction),
      include: {
        _count: {
          select: { issues: true },
        },
      },
    }),
    Promise.all(
      MAGAZINE_FILTERS.map((option) =>
        prisma.magazine.count({ where: option.where })
      )
    ),
  ]);

  const filterCounts = Object.fromEntries(
    MAGAZINE_FILTERS.map((option, i) => [option.value, counts[i]])
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">雜誌列表</h1>
        <p className="mt-2 text-muted-foreground">
          瀏覽所有收錄的遊戲雜誌
          {magazines.length > 0 && `，共 ${magazines.length} 本`}
        </p>
      </div>

      <div className="mb-6">
        <MagazineBrowseBar
          basePath="/magazines"
          filter={filter}
          sort={sort}
          direction={direction}
          counts={filterCounts}
        />
      </div>

      {magazines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-xl font-semibold">
            {filter.value === "all" ? "尚無雜誌資料" : "這個分類還沒有刊物"}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {filter.value === "all" ? "資料建置中，敬請期待" : "試試其他分類"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {magazines.map((magazine) => (
            <Link key={magazine.id} href={`/magazines/${magazine.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-lg gap-3">
                <CardHeader className="pb-0 gap-1">
                  <div className="mb-2 flex h-20 items-center justify-center rounded-lg bg-muted/50">
                    {magazine.logoImage ? (
                      <Image
                        src={magazine.logoImage}
                        alt={magazine.name}
                        width={300}
                        height={80}
                        unoptimized
                        className="h-16 w-auto object-contain px-3"
                      />
                    ) : (
                      <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                    )}
                  </div>
                  <CardTitle className="line-clamp-1 text-base">{magazine.name}</CardTitle>
                  {magazine.nameOriginal && (
                    <CardDescription className="line-clamp-1 text-xs">
                      {magazine.nameOriginal}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground text-xs">
                      {magazine.publisher || "未知出版社"}
                    </span>
                    <Badge variant={magazine.isActive ? "default" : "secondary"} className="text-xs">
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
