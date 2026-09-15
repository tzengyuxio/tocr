import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { photoCreateSchema } from "@/lib/validators/photo";
import { withErrorHandler } from "@/lib/api-utils";
import { logEdit } from "@/lib/edit-log";

// POST /api/photos - 新增一張額外圖片
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = photoCreateSchema.parse(await request.json());

  // 排在同一個掛點現有的圖之後。同時貼兩張會拿到同一個 order，那只讓兩張圖
  // 的先後由 id 決定，不值得為它上鎖。
  const last = await prisma.photo.findFirst({
    where: data.magazineId
      ? { magazineId: data.magazineId }
      : { issueId: data.issueId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const photo = await prisma.photo.create({
    data: { ...data, order: last ? last.order + 1 : 0 },
  });

  await logEdit("Photo", photo.id, "CREATE", {
    url: photo.url,
    magazineId: photo.magazineId,
    issueId: photo.issueId,
  });

  return NextResponse.json(photo, { status: 201 });
}, "Create photo");
