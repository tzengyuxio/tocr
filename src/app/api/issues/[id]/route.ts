import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueUpdateSchema } from "@/lib/validators/issue";

// GET /api/issues/[id] - 取得單一期數
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
  } catch (error) {
    console.error("Failed to fetch issue:", error);
    return NextResponse.json(
      { error: "Failed to fetch issue" },
      { status: 500 }
    );
  }
}

// PUT /api/issues/[id] - 更新期數
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = issueUpdateSchema.parse(body);

    const issue = await prisma.issue.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(issue);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to update issue:", error);
    return NextResponse.json(
      { error: "Failed to update issue" },
      { status: 500 }
    );
  }
}

// DELETE /api/issues/[id] - 刪除期數
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.issue.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete issue:", error);
    return NextResponse.json(
      { error: "Failed to delete issue" },
      { status: 500 }
    );
  }
}
