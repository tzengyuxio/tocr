import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { magazineUpdateSchema } from "@/lib/validators/magazine";
import { withErrorHandler } from "@/lib/api-utils";
import { logEdit } from "@/lib/edit-log";

// GET /api/magazines/[id] - 取得單一期刊
export const GET = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;

  const magazine = await prisma.magazine.findUnique({
    where: { id },
    include: {
      issues: {
        orderBy: { publishDate: "desc" },
        take: 10,
      },
      _count: {
        select: { issues: true },
      },
    },
  });

  if (!magazine) {
    return NextResponse.json(
      { error: "Magazine not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(magazine);
}, "Fetch magazine");

// PUT /api/magazines/[id] - 更新期刊
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;
  const body = await request.json();
  const validatedData = magazineUpdateSchema.parse(body);

  const magazine = await prisma.magazine.update({
    where: { id },
    data: validatedData,
  });

  await logEdit("Magazine", id, "UPDATE", validatedData);

  return NextResponse.json(magazine);
}, "Update magazine");

// DELETE /api/magazines/[id] - 刪除期刊
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;

  await prisma.magazine.delete({
    where: { id },
  });

  await logEdit("Magazine", id, "DELETE");

  return NextResponse.json({ success: true });
}, "Delete magazine");
