import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, BookOpen, Upload } from "lucide-react";
import { MagazineListClient } from "@/components/magazine/MagazineListClient";
import { MagazineBrowseBar } from "@/components/magazine/MagazineBrowseBar";
import {
  ADMIN_MAGAZINE_SORTS,
  magazineOrderBy,
  parseMagazineDirection,
  parseMagazineSort,
} from "@/lib/magazine-browse";
import { sortTitlePeriods } from "@/lib/magazine-title";

export default async function MagazinesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const params = await searchParams;
  const sort = parseMagazineSort(params.sort, ADMIN_MAGAZINE_SORTS);
  const direction = parseMagazineDirection(params.dir, sort);

  const magazines = await prisma.magazine.findMany({
    orderBy: magazineOrderBy(sort, direction),
    include: {
      _count: {
        select: { issues: true },
      },
      titles: {
        select: { title: true, startIssue: { select: { order: true } } },
      },
    },
  });

  // 前台把有沿革的雜誌展開成一時期一卡，所以那邊的「共 N 本」比這裡大。
  // 把展開後的數字並列出來，兩邊的數字才對得起來。
  const unitCount = magazines.reduce(
    (sum, magazine) => sum + (magazine.titles.length || 1),
    0
  );

  // 歷任刊名列在通行名底下，管理清單才 ctrl-F 得到「遊戲世界」這種舊名。
  const rows = magazines.map(({ titles, ...magazine }) => ({
    ...magazine,
    otherTitles: sortTitlePeriods(titles)
      .map((t) => t.title)
      .filter((title) => title !== magazine.name),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">雜誌管理</h2>
          <p className="text-muted-foreground">管理所有雜誌的基本資訊</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/magazines/import">
              <Upload className="mr-2 h-4 w-4" />
              批次匯入
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/magazines/new">
              <Plus className="mr-2 h-4 w-4" />
              新增雜誌
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>雜誌列表</CardTitle>
          <CardDescription>
            共 {magazines.length} 本雜誌
            {unitCount !== magazines.length &&
              `（含刊名沿革展開為 ${unitCount} 個刊名，前台以此計數）`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 後台只掛排序，不掛分類篩選：這裡是管理清單，要看得到全部。 */}
          <MagazineBrowseBar
            basePath="/admin/magazines"
            sort={sort}
            sorts={ADMIN_MAGAZINE_SORTS}
            direction={direction}
          />
          {magazines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">尚無雜誌資料</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                點擊上方「新增雜誌」按鈕開始建立您的第一本雜誌
              </p>
            </div>
          ) : (
            <MagazineListClient magazines={rows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
