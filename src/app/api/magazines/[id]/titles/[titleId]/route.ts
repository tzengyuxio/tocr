import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { magazineTitleUpdateSchema } from "@/lib/validators/magazine-title";
import { withErrorHandler } from "@/lib/api-utils";
import { logEdit } from "@/lib/edit-log";
import { diffChanges } from "@/lib/edit-log-diff";

/** 兩段路徑都要對得上，拿著別本雜誌的 titleId 打不進來。 */
async function findOwnedTitle(magazineId: string, titleId: string) {
  const title = await prisma.magazineTitle.findUnique({ where: { id: titleId } });
  return title && title.magazineId === magazineId ? title : null;
}

// PUT /api/magazines/[id]/titles/[titleId] - 更新刊名時期
export const PUT = withErrorHandler(async (request: NextRequest, context) => {
  const { id: magazineId, titleId } = await context!.params;
  const body = await request.json();
  const data = magazineTitleUpdateSchema.parse(body);

  const before = await findOwnedTitle(magazineId, titleId);
  if (!before) {
    return NextResponse.json({ error: "Title not found" }, { status: 404 });
  }

  if (data.startIssueId && data.startIssueId !== before.startIssueId) {
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
  }

  const title = await prisma.magazineTitle.update({
    where: { id: titleId },
    data,
  });

  await logEdit("MagazineTitle", titleId, "UPDATE", diffChanges(before, title));

  return NextResponse.json(title);
}, "Update magazine title");

// DELETE /api/magazines/[id]/titles/[titleId] - 刪除刊名時期
export const DELETE = withErrorHandler(async (request: NextRequest, context) => {
  const { id: magazineId, titleId } = await context!.params;

  const title = await findOwnedTitle(magazineId, titleId);
  if (!title) {
    return NextResponse.json({ error: "Title not found" }, { status: 404 });
  }

  await prisma.magazineTitle.delete({ where: { id: titleId } });

  await logEdit("MagazineTitle", titleId, "DELETE", {
    title: { from: title.title, to: null },
  });

  return NextResponse.json({ success: true });
}, "Delete magazine title");
