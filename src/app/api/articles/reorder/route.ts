import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { articleReorderSchema } from "@/lib/validators/reorder";
import { withErrorHandler } from "@/lib/api-utils";
import { logEdit } from "@/lib/edit-log";
import { markIssueChanged } from "@/lib/issue-complete";

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { issueId, articleIds } = articleReorderSchema.parse(body);

  // 「依頁碼排序」不管目前是什麼順序都會送一次，所以先問清楚有沒有真的動到。
  // 沒動到卻照寫，會留下一行說不出改了什麼的紀錄，也會讓完備標記無端失效。
  const current = await prisma.article.findMany({
    where: { issueId },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  const unchanged =
    current.length === articleIds.length &&
    current.every((article, index) => article.id === articleIds[index]);
  if (unchanged) {
    return NextResponse.json({ success: true });
  }

  await prisma.$transaction(
    articleIds.map((id, index) =>
      prisma.article.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  // Same as the issue reorder: what changed is the issue whose contents were
  // rearranged, so the log points at the issue rather than at each article.
  await logEdit("Issue", issueId, "UPDATE", { action: "reorder", articleIds });
  // 目錄的順序也是目錄的一部分。
  await markIssueChanged(issueId);

  return NextResponse.json({ success: true });
}, "Reorder articles");
