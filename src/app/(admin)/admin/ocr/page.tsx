import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { OcrPageClient } from "./OcrPageClient";

interface PageProps {
  searchParams: Promise<{ issueId?: string }>;
}

export default async function OcrPage({ searchParams }: PageProps) {
  const { issueId } = await searchParams;

  // 若有指定 issueId，取得單期資訊
  let issue = null;
  if (issueId) {
    // Select rather than include: the full row carries a Decimal price, which
    // React cannot hand to a Client Component.
    issue = await prisma.issue.findUnique({
      where: { id: issueId },
      select: {
        id: true,
        issueNumber: true,
        publishDate: true,
        tocImages: true,
        magazine: {
          select: { id: true, name: true },
        },
      },
    });
  }

  // 取得期刊列表供選擇
  const magazines = await prisma.magazine.findMany({
    orderBy: { name: "asc" },
    include: {
      issues: {
        orderBy: { publishSort: "desc" },
        select: {
          id: true,
          issueNumber: true,
          publishDate: true,
          tocImages: true,
        },
      },
    },
  });

  return (
    <Suspense fallback={<div>載入中...</div>}>
      <OcrPageClient
        initialIssue={issue}
        magazines={magazines}
      />
    </Suspense>
  );
}
