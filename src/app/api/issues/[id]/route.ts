import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueUpdateSchema } from "@/lib/validators/issue";
import { withErrorHandler } from "@/lib/api-utils";
import { logEdit } from "@/lib/edit-log";

// GET /api/issues/[id] - 取得單一單期
export const GET = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;

  const issue = await prisma.issue.findUnique({
    where: { id },
    include: {
      magazine: {
        select: { id: true, name: true },
      },
      articles: {
        orderBy: { sortOrder: "asc" },
        include: {
          articleTags: {
            include: { tag: true },
          },
          articleGames: {
            include: { game: true },
          },
        },
      },
    },
  });

  if (!issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  return NextResponse.json(issue);
}, "Fetch issue");

// PUT /api/issues/[id] - 更新單期
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;
  const body = await request.json();
  const validatedData = issueUpdateSchema.parse(body);

  const issue = await prisma.issue.update({
    where: { id },
    data: validatedData,
  });

  await logEdit("Issue", id, "UPDATE", validatedData);

  return NextResponse.json(issue);
}, "Update issue");

// DELETE /api/issues/[id] - 刪除單期
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;

  await prisma.issue.delete({
    where: { id },
  });

  await logEdit("Issue", id, "DELETE");

  return NextResponse.json({ success: true });
}, "Delete issue");
