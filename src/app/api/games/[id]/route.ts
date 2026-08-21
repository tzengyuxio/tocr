import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameUpdateSchema } from "@/lib/validators/game";
import { withErrorHandler } from "@/lib/api-utils";
import { logEdit } from "@/lib/edit-log";
import { diffChanges } from "@/lib/edit-log-diff";
import { gameNameKeys } from "@/lib/name-match";

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

  const before = await prisma.game.findUnique({ where: { id } });

  const game = await prisma.game.update({
    where: { id },
    // Keyed off the row as it will be, not as it was: a rename or a new alias
    // has to take the keys with it, or recognition goes on matching the old
    // spelling and stops matching the new one.
    data: {
      ...validatedData,
      ...(before && { nameKeys: gameNameKeys({ ...before, ...validatedData }) }),
    },
  });

  await logEdit("Game", id, "UPDATE", diffChanges(before, game));

  return NextResponse.json(game);
}, "Update game");

// DELETE /api/games/[id] - 刪除遊戲
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;

  // delete() 回傳被刪的那筆，正好用來記下它叫什麼 -- 紀錄活得比資料久，
  // 只留 id 的話事後看不出刪掉的是什麼。
  const deleted = await prisma.game.delete({
    where: { id },
  });

  await logEdit("Game", id, "DELETE", { name: { from: deleted.name, to: null }, slug: { from: deleted.slug, to: null } });

  return NextResponse.json({ success: true });
}, "Delete game");
