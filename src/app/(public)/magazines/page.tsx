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
import { MagazineList } from "@/components/magazine/MagazineList";
import {
  MAGAZINE_FILTERS,
  magazineDisplayUnits,
  parseMagazineDirection,
  parseMagazineFilter,
  parseMagazineSort,
  parseMagazineView,
  sortMagazineDisplayUnits,
} from "@/lib/magazine-browse";

export default async function MagazinesPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    sort?: string;
    dir?: string;
    view?: string;
  }>;
}) {
  const params = await searchParams;
  const filter = parseMagazineFilter(params.filter);
  const sort = parseMagazineSort(params.sort);
  const direction = parseMagazineDirection(params.dir, sort);
  const view = parseMagazineView(params.view);

  // 一次抓全部（30 幾本），分類篩選與 chips 計數都在展開之後的顯示單位上做
  // ——chips 的數字與頁首「共 N 本」才數的是同一種東西（時期卡），不會一邊
  // 36 一邊 40。
  const magazines = await prisma.magazine.findMany({
    include: {
      _count: {
        select: { issues: true },
      },
      titles: {
        select: {
          id: true,
          title: true,
          logoImage: true,
          startIssue: { select: { order: true } },
        },
      },
    },
  });

  // 有刊名沿革的雜誌要展開成一時期一卡，期間與期數從各時期涵蓋的期推導，
  // 所以把這幾本（絕大多數雜誌沒有 titles，撈不到幾筆）的期抓進來分段。
  const withTitles = magazines.filter((magazine) => magazine.titles.length > 0);
  const periodIssues = withTitles.length
    ? await prisma.issue.findMany({
        where: { magazineId: { in: withTitles.map((m) => m.id) } },
        select: { magazineId: true, order: true, publishSort: true },
        orderBy: { order: "asc" },
      })
    : [];
  const issuesByMagazine = new Map<string, typeof periodIssues>();
  for (const issue of periodIssues) {
    const list = issuesByMagazine.get(issue.magazineId);
    if (list) list.push(issue);
    else issuesByMagazine.set(issue.magazineId, [issue]);
  }

  const allUnits = magazines.flatMap((magazine) =>
    magazineDisplayUnits(magazine, issuesByMagazine.get(magazine.id) ?? [])
  );

  const units = sortMagazineDisplayUnits(
    filter.category
      ? allUnits.filter((unit) => unit.categories.includes(filter.category!))
      : allUnits,
    sort,
    direction
  );

  const filterCounts = Object.fromEntries(
    MAGAZINE_FILTERS.map((option) => [
      option.value,
      option.category
        ? allUnits.filter((unit) => unit.categories.includes(option.category))
            .length
        : allUnits.length,
    ])
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">雜誌列表</h1>
        <p className="mt-2 text-muted-foreground">
          瀏覽所有收錄的遊戲雜誌
          {units.length > 0 && `，共 ${units.length} 本`}
        </p>
      </div>

      <div className="mb-6">
        <MagazineBrowseBar
          basePath="/magazines"
          filter={filter}
          sort={sort}
          direction={direction}
          view={view}
          counts={filterCounts}
        />
      </div>

      {units.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-xl font-semibold">
            {filter.value === "all" ? "尚無雜誌資料" : "這個分類還沒有刊物"}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {filter.value === "all" ? "資料建置中，敬請期待" : "試試其他分類"}
          </p>
        </div>
      ) : view === "list" ? (
        <MagazineList units={units} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {units.map((unit) => (
            <Link key={unit.key} href={unit.href}>
              <Card className="h-full transition-shadow hover:shadow-lg gap-3">
                <CardHeader className="pb-0 gap-1">
                  <div className="mb-2 flex h-20 items-center justify-center rounded-lg bg-muted/50">
                    {unit.logoImage ? (
                      <Image
                        src={unit.logoImage}
                        alt={unit.name}
                        width={300}
                        height={80}
                        unoptimized
                        className="h-16 w-auto object-contain px-3"
                      />
                    ) : (
                      <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                    )}
                  </div>
                  <CardTitle className="line-clamp-1 text-base">
                    {unit.name}
                    {unit.previousTitle && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        （原 {unit.previousTitle}）
                      </span>
                    )}
                  </CardTitle>
                  {unit.nameParallel && (
                    <CardDescription className="line-clamp-1 text-xs">
                      {unit.nameParallel}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground text-xs">
                      {unit.publisher || "未知出版社"}
                    </span>
                    <Badge variant={unit.isActive ? "default" : "secondary"} className="text-xs">
                      {unit.issueCount} 期
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
