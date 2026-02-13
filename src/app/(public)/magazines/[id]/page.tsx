export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IssueCard } from "@/components/IssueCard";
import { BookOpen, ArrowLeft, Calendar, SquarePen } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { auth } from "@/lib/auth";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const magazine = await prisma.magazine.findUnique({ where: { id }, select: { name: true } });
  return { title: magazine?.name ?? "期刊詳情" };
}

export default async function MagazineDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR";

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

  return (
    <div className="container mx-auto px-4 py-8">
      <Button asChild variant="ghost" className="mb-6">
        <Link href="/magazines">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回期刊列表
        </Link>
      </Button>

      {/* 期刊資訊 */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row">
        {magazine.coverImage ? (
          <img
            src={magazine.coverImage}
            alt={magazine.name}
            className="h-64 w-48 rounded-lg object-cover shadow-lg"
          />
        ) : (
          <div className="flex h-64 w-48 items-center justify-center rounded-lg bg-muted shadow-lg">
            <BookOpen className="h-16 w-16 text-muted-foreground/50" />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{magazine.name}</h1>
            {canEdit && (
              <Link
                href={`/admin/magazines/${id}`}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="編輯此期刊"
              >
                <SquarePen className="h-4 w-4" />
              </Link>
            )}
          </div>
          {magazine.nameEn && (
            <p className="mt-1 text-lg text-muted-foreground">
              {magazine.nameEn}
            </p>
          )}
          <div className="mt-4 space-y-2 text-sm">
            {magazine.publisher && (
              <p>
                <span className="text-muted-foreground">出版社：</span>
                {magazine.publisher}
              </p>
            )}
            {magazine.issn && (
              <p>
                <span className="text-muted-foreground">ISSN：</span>
                {magazine.issn}
              </p>
            )}
            {magazine.foundedDate && (
              <p>
                <span className="text-muted-foreground">創刊日期：</span>
                {format(new Date(magazine.foundedDate), "yyyy 年 M 月", {
                  locale: zhTW,
                })}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">狀態：</span>
              <Badge
                variant={magazine.isActive ? "default" : "secondary"}
                className="ml-1"
              >
                {magazine.isActive ? "發行中" : "已停刊"}
              </Badge>
            </p>
          </div>
          {magazine.description && (
            <p className="mt-4 text-muted-foreground">{magazine.description}</p>
          )}
        </div>
      </div>

      {/* 期數列表 */}
      <div>
        <h2 className="mb-4 text-2xl font-bold">
          期數列表
          <span className="ml-2 text-lg font-normal text-muted-foreground">
            （共 {magazine.issues.length} 期）
          </span>
        </h2>

        {magazine.issues.length === 0 ? (
          <div className="rounded-lg border p-8 text-center">
            <p className="text-muted-foreground">尚無期數資料</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {magazine.issues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                magazineId={magazine.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
