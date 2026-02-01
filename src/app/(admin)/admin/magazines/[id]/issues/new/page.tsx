import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { IssueForm } from "@/components/magazine/IssueForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewIssuePage({ params }: PageProps) {
  const { id } = await params;

  const magazine = await prisma.magazine.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!magazine) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <IssueForm
        magazineId={magazine.id}
        magazineName={magazine.name}
        mode="create"
      />
    </div>
  );
}
