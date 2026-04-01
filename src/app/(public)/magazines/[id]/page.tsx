export const revalidate = 60;

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IssueCard } from "@/components/IssueCard";
import { BookOpen, ArrowLeft, Calendar, SquarePen } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { auth } from "@/lib/auth";
import { Breadcrumb } from "@/components/Breadcrumb";

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
      <Breadcrumb items={[{ label: "期刊", href: "/magazines" }, { label: magazine.name }]} />

      {/* 期刊資訊 */}
      <div className="mb-8">
        {magazine.logoImage && (
          <div className="mb-4 flex h-24 items-center rounded-lg bg-muted/30 px-4">
            <Image
              src={magazine.logoImage}
              alt={magazine.name}
              width={400}
              height={120}
              unoptimized
              className="h-20 w-auto object-contain"
            />
          </div>
        )}
        <div>
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
          {magazine.nameOriginal && (
            <p className="mt-1 text-lg text-muted-foreground">
              {magazine.nameOriginal}
            </p>
          )}
          {magazine.aliases && magazine.aliases.length > 0 && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {magazine.aliases.join(" / ")}
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

      {/* 單期列表 */}
      <div>
        <h2 className="mb-4 text-2xl font-bold">
          單期列表
          <span className="ml-2 text-lg font-normal text-muted-foreground">
            （共 {magazine.issues.length} 期）
          </span>
        </h2>

        {magazine.issues.length === 0 ? (
          <div className="rounded-lg border p-8 text-center">
            <p className="text-muted-foreground">尚無單期資料</p>
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
