import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameUpdateSchema } from "@/lib/validators/game";

// GET /api/games/[id] - 取得單一遊戲
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        articleGames: {
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            article: {
              select: {
                id: true,
                title: true,
                category: true,
                pageStart: true,
                issue: {
                  select: {
                    id: true,
                    issueNumber: true,
                    publishDate: true,
                    magazine: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
          },
        },
        _count: {
          select: { articleGames: true },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error("Failed to fetch game:", error);
    return NextResponse.json(
      { error: "Failed to fetch game" },
      { status: 500 }
    );
  }
}

// PUT /api/games/[id] - 更新遊戲
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = gameUpdateSchema.parse(body);

    // 檢查 slug 是否與其他遊戲重複
    if (validatedData.slug) {
      const existing = await prisma.game.findFirst({
        where: {
          slug: validatedData.slug,
          NOT: { id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Slug already exists" },
          { status: 400 }
        );
      }
    }

    const game = await prisma.game.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(game);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to update game:", error);
    return NextResponse.json(
      { error: "Failed to update game" },
      { status: 500 }
    );
  }
}

// DELETE /api/games/[id] - 刪除遊戲
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.game.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete game:", error);
    return NextResponse.json(
      { error: "Failed to delete game" },
      { status: 500 }
    );
  }
}
