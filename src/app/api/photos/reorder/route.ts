import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { photoReorderSchema } from "@/lib/validators/photo";
import { withErrorHandler } from "@/lib/api-utils";
import { logEdit } from "@/lib/edit-log";

// PUT /api/photos/reorder - 同一個掛點底下的排序
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const { photoIds } = photoReorderSchema.parse(await request.json());

  await prisma.$transaction(
    photoIds.map((id, index) =>
      prisma.photo.update({ where: { id }, data: { order: index } })
    )
  );

  // 一次排序記一列，掛在被排的第一張上——順序是這批圖共同的屬性，記在每張上
  // 只會讓同一件事出現 n 次。與 /api/issues/reorder 同樣的取捨。
  if (photoIds.length > 0) {
    await logEdit("Photo", photoIds[0], "UPDATE", { action: "reorder", photoIds });
  }

  return NextResponse.json({ success: true });
}, "Reorder photos");
