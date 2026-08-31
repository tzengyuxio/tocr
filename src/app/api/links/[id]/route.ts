import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { externalLinkUpdateSchema } from "@/lib/validators/external-link";
import { withErrorHandler } from "@/lib/api-utils";
import { logEdit } from "@/lib/edit-log";
import { diffChanges } from "@/lib/edit-log-diff";

// PATCH /api/links/[id] - 改站點、網址或顯示名稱
export const PATCH = withErrorHandler(async (request: NextRequest, context) => {
  const { id } = await context!.params;
  const data = externalLinkUpdateSchema.parse(await request.json());

  const before = await prisma.externalLink.findUnique({ where: { id } });
  const link = await prisma.externalLink.update({ where: { id }, data });

  await logEdit("ExternalLink", id, "UPDATE", diffChanges(before, link));

  return NextResponse.json(link);
}, "Update external link");

// DELETE /api/links/[id] - 刪除
export const DELETE = withErrorHandler(async (request: NextRequest, context) => {
  const { id } = await context!.params;

  // 回傳被刪的那筆正好用來記它指向哪：紀錄活得比資料久。
  const deleted = await prisma.externalLink.delete({ where: { id } });

  await logEdit("ExternalLink", id, "DELETE", {
    url: { from: deleted.url, to: null },
  });

  return NextResponse.json({ success: true });
}, "Delete external link");
