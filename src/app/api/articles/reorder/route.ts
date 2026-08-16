import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { articleReorderSchema } from "@/lib/validators/reorder";
import { withErrorHandler } from "@/lib/api-utils";
import { logEdit } from "@/lib/edit-log";

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { issueId, articleIds } = articleReorderSchema.parse(body);

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

  return NextResponse.json({ success: true });
}, "Reorder articles");
