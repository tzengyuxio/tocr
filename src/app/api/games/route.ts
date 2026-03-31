import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameCreateSchema } from "@/lib/validators/game";
import { withErrorHandler, paginatedResponse, parsePagination } from "@/lib/api-utils";

// GET /api/games - 取得遊戲列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const { page, limit, skip } = parsePagination(searchParams);
  const search = searchParams.get("search") || "";
  const platform = searchParams.get("platform");
  const genre = searchParams.get("genre");

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { nameEn: { contains: search, mode: "insensitive" as const } },
        { nameOriginal: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(platform && {
      platforms: { has: platform },
    }),
    ...(genre && {
      genres: { has: genre },
    }),
  };

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: limit,
      include: {
        _count: {
          select: { articleGames: true },
        },
      },
    }),
    prisma.game.count({ where }),
  ]);

  return paginatedResponse(games, total, page, limit);
}, "Fetch games");

// POST /api/games - 新增遊戲
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validatedData = gameCreateSchema.parse(body);

  // 檢查 slug 是否重複
  const existing = await prisma.game.findUnique({
    where: { slug: validatedData.slug },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Slug already exists" },
      { status: 400 }
    );
  }

  const game = await prisma.game.create({
    data: validatedData,
  });

  return NextResponse.json(game, { status: 201 });
}, "Create game");
