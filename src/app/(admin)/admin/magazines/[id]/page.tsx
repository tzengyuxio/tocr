import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MagazineForm } from "@/components/magazine/MagazineForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMagazinePage({ params }: PageProps) {
  const { id } = await params;

  const magazine = await prisma.magazine.findUnique({
    where: { id },
    include: {
      issues: {
        orderBy: { publishDate: "desc" },
        include: {
          _count: {
            select: { articles: true },
          },
        },
      },
    },
  });

  if (!magazine) {
    notFound();
  }

  const formData = {
    id: magazine.id,
    name: magazine.name,
    nameEn: magazine.nameEn,
    publisher: magazine.publisher,
    issn: magazine.issn,
    description: magazine.description,
    coverImage: magazine.coverImage,
    foundedDate: magazine.foundedDate,
    endedDate: magazine.endedDate,
    isActive: magazine.isActive,
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      {/* 左欄：編輯表單 */}
      <div>
        <MagazineForm initialData={formData} mode="edit" />
      </div>

      {/* 右欄：期數列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>期數列表</CardTitle>
            <CardDescription>
              共 {magazine.issues.length} 期
            </CardDescription>
          </div>
          <Button asChild>
            <Link href={`/admin/magazines/${magazine.id}/issues/new`}>
              <Plus className="mr-2 h-4 w-4" />
              新增期數
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {magazine.issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">尚無期數資料</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                點擊「新增期數」按鈕開始建立期數
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>封面</TableHead>
                  <TableHead>期號</TableHead>
                  <TableHead>特輯標題</TableHead>
                  <TableHead>出版日期</TableHead>
                  <TableHead>文章數</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {magazine.issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      {issue.coverImage ? (
                        <img
                          src={issue.coverImage}
                          alt={issue.issueNumber}
                          className="h-12 w-9 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-9 items-center justify-center rounded bg-muted">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {issue.issueNumber}
                    </TableCell>
                    <TableCell>{issue.title || "-"}</TableCell>
                    <TableCell>
                      {format(new Date(issue.publishDate), "yyyy/MM/dd", {
                        locale: zhTW,
                      })}
                    </TableCell>
                    <TableCell>{issue._count.articles} 篇</TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon">
                        <Link
                          href={`/admin/magazines/${magazine.id}/issues/${issue.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
