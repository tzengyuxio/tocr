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

export default async function MagazinesPage() {
  const magazines = await prisma.magazine.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { issues: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">期刊管理</h2>
          <p className="text-muted-foreground">管理所有期刊的基本資訊</p>
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
              新增期刊
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>期刊列表</CardTitle>
          <CardDescription>共 {magazines.length} 本期刊</CardDescription>
        </CardHeader>
        <CardContent>
          {magazines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">尚無期刊資料</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                點擊上方「新增期刊」按鈕開始建立您的第一本期刊
              </p>
            </div>
          ) : (
            <MagazineListClient magazines={magazines} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
