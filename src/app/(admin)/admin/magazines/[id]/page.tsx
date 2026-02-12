import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MagazineForm } from "@/components/magazine/MagazineForm";
import { IssueListClient } from "@/components/magazine/IssueListClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMagazinePage({ params }: PageProps) {
  const { id } = await params;

  const magazine = await prisma.magazine.findUnique({
    where: { id },
    include: {
      issues: {
        orderBy: { order: "asc" },
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
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <MagazineForm initialData={formData} mode="edit" />
      </div>
      <IssueListClient magazineId={magazine.id} issues={magazine.issues} />
    </div>
  );
}
