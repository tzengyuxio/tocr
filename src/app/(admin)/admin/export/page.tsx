import { prisma } from "@/lib/prisma";
import { ExportPageClient } from "./ExportPageClient";

export default async function ExportPage() {
  const [magazineCount, issueCount, articleCount, magazines] =
    await Promise.all([
      prisma.magazine.count(),
      prisma.issue.count(),
      prisma.article.count(),
      prisma.magazine.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

  return (
    <ExportPageClient
      magazineCount={magazineCount}
      issueCount={issueCount}
      articleCount={articleCount}
      magazines={magazines}
    />
  );
}
