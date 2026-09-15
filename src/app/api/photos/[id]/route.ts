import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { photoUpdateSchema } from "@/lib/validators/photo";
import { withErrorHandler } from "@/lib/api-utils";
import { logEdit } from "@/lib/edit-log";
import { diffChanges } from "@/lib/edit-log-diff";

// PATCH /api/photos/[id] - 改說明、來源或公開與否
export const PATCH = withErrorHandler(async (request: NextRequest, context) => {
  const { id } = await context!.params;
  const data = photoUpdateSchema.parse(await request.json());

  const before = await prisma.photo.findUnique({ where: { id } });
  const photo = await prisma.photo.update({ where: { id }, data });

  await logEdit("Photo", id, "UPDATE", diffChanges(before, photo));

  return NextResponse.json(photo);
}, "Update photo");

// DELETE /api/photos/[id] - 刪除
export const DELETE = withErrorHandler(async (request: NextRequest, context) => {
  const { id } = await context!.params;

  // 回傳被刪的那筆正好用來記它是哪張圖：紀錄活得比資料久，只留 id 事後看不出
  // 刪掉的是什麼。Blob 上的檔留著，與刪雜誌、刪單期時的行為一致。
  const deleted = await prisma.photo.delete({ where: { id } });

  await logEdit("Photo", id, "DELETE", { url: { from: deleted.url, to: null } });

  return NextResponse.json({ success: true });
}, "Delete photo");
