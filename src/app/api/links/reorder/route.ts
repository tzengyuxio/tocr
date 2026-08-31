import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { externalLinkReorderSchema } from "@/lib/validators/external-link";
import { withErrorHandler } from "@/lib/api-utils";
import { logEdit } from "@/lib/edit-log";

// PUT /api/links/reorder - 同一個掛點底下的排序
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const { linkIds } = externalLinkReorderSchema.parse(await request.json());

  await prisma.$transaction(
    linkIds.map((id, index) =>
      prisma.externalLink.update({ where: { id }, data: { order: index } })
    )
  );

  // 一次排序記一列，掛在被排的第一條上——同 /api/photos/reorder。
  if (linkIds.length > 0) {
    await logEdit("ExternalLink", linkIds[0], "UPDATE", { action: "reorder", linkIds });
  }

  return NextResponse.json({ success: true });
}, "Reorder external links");
