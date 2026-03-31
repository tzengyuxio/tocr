import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameUpdateSchema } from "@/lib/validators/game";
import { withErrorHandler } from "@/lib/api-utils";

// GET /api/games/[id] - 取得單一遊戲
export const GET = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;
  const searchParams = request.nextUrl.searchParams;
  const all = searchParams.get("all") === "true";

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      articleGames: {
        ...(all ? {} : { take: 20 }),
        orderBy: { createdAt: "desc" },
        include: {
          article: {
            select: {
              id: true,
              title: true,
              category: true,
              pageStart: true,
              pageEnd: true,
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
}, "Fetch game");

// PUT /api/games/[id] - 更新遊戲
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;
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
}, "Update game");

// DELETE /api/games/[id] - 刪除遊戲
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;

  await prisma.game.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}, "Delete game");
