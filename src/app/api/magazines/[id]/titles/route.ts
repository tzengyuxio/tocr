import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { magazineTitleCreateSchema } from "@/lib/validators/magazine-title";
import { withErrorHandler } from "@/lib/api-utils";
import { logEdit } from "@/lib/edit-log";

// POST /api/magazines/[id]/titles - 新增刊名時期
export const POST = withErrorHandler(async (request: NextRequest, context) => {
  const { id: magazineId } = await context!.params;
  const body = await request.json();
  const data = magazineTitleCreateSchema.parse(body);

  // 起始期必須是這本雜誌自己的期——選單只列自家的，但 API 不能只信選單。
  const startIssue = await prisma.issue.findUnique({
    where: { id: data.startIssueId },
    select: { magazineId: true },
  });
  if (!startIssue || startIssue.magazineId !== magazineId) {
    return NextResponse.json(
      { error: "起始期不屬於這本雜誌" },
      { status: 400 }
    );
  }

  const title = await prisma.magazineTitle.create({
    data: { ...data, magazineId },
  });

  await logEdit("MagazineTitle", title.id, "CREATE");

  return NextResponse.json(title, { status: 201 });
}, "Create magazine title");
