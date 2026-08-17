import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MagazineForm } from "@/components/magazine/MagazineForm";
import { IssueListClient } from "@/components/magazine/IssueListClient";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMagazinePage({ params }: PageProps) {
  const { id } = await params;

  const magazine = await prisma.magazine.findUnique({
    where: { id },
    include: {
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
    nameOriginal: magazine.nameOriginal,
    aliases: magazine.aliases,
    publisher: magazine.publisher,
    issn: magazine.issn,
    description: magazine.description,
    logoImage: magazine.logoImage,
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
        <div className="lg:col-span-1">
          <MagazineForm initialData={formData} mode="edit" />
        </div>
        <IssueListClient magazineId={magazine.id} issues={magazine.issues} />
      </div>
    </div>
  );
}
