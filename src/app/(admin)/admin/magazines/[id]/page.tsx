import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MagazineForm } from "@/components/magazine/MagazineForm";
import { PhotoSection } from "@/components/PhotoSection";
import { MagazineTitleSection } from "@/components/magazine/MagazineTitleSection";
import { IssueListClient } from "@/components/magazine/IssueListClient";
import { isSessionAdmin } from "@/lib/require-editor";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMagazinePage({ params }: PageProps) {
  const { id } = await params;

  const magazine = await prisma.magazine.findUnique({
    where: { id },
    include: {
      titles: {
        select: {
          id: true,
          title: true,
          titleParallel: true,
          titleSource: true,
          startIssueId: true,
          logoImage: true,
          note: true,
        },
      },
      // 後台兩種都列——未公開的在這裡才看得到、才改得動。
      photos: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          url: true,
          caption: true,
          sourceName: true,
          sourceUrl: true,
          isPublic: true,
        },
      },
      // Select rather than include: the full row carries a Decimal price,
      // which React cannot hand to a Client Component -- the same reason
      // /admin/ocr selects its columns.
      issues: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          issueNumber: true,
          title: true,
          publishDate: true,
          coverImage: true,
          order: true,
          completeAt: true,
          completeStaleAt: true,
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
    slug: magazine.slug,
    nameParallel: magazine.nameParallel,
    sourceTitle: magazine.sourceTitle,
    aliases: magazine.aliases,
    publisher: magazine.publisher,
    issn: magazine.issn,
    knownIssueCount: magazine.knownIssueCount,
    knownIssueCountSource: magazine.knownIssueCountSource,
    description: magazine.description,
    logoImage: magazine.logoImage,
    categories: magazine.categories,
    foundedDate: magazine.foundedDate,
    endedDate: magazine.endedDate,
    isActive: magazine.isActive,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/magazines"
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">{magazine.name}</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <MagazineForm initialData={formData} mode="edit" />
          <PhotoSection
            owner={{ magazineId: magazine.id }}
            photos={magazine.photos}
            description="網路上看到的、網拍截下來的圖，以及實體收藏照（書背、書櫃、整疊）。單期自己的封面請放在該期底下。看不出是哪一期的圖放這裡，推測寫在說明欄"
          />
          <MagazineTitleSection
            magazineId={magazine.id}
            magazineName={magazine.name}
            titles={magazine.titles}
            issues={magazine.issues.map((issue) => ({
              id: issue.id,
              issueNumber: issue.issueNumber,
              order: issue.order,
            }))}
          />
        </div>
        <IssueListClient
          magazineId={magazine.id}
          issues={magazine.issues}
          showComplete={await isSessionAdmin()}
        />
      </div>
    </div>
  );
}
