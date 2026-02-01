import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameCreateSchema } from "@/lib/validators/game";

// GET /api/games - 取得遊戲列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
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
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { articleGames: true },
          },
        },
      }),
      prisma.game.count({ where }),
    ]);

    return NextResponse.json({
      data: games,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch games:", error);
    return NextResponse.json(
      { error: "Failed to fetch games" },
      { status: 500 }
    );
  }
}

// POST /api/games - 新增遊戲
export async function POST(request: NextRequest) {
  try {
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
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to create game:", error);
    return NextResponse.json(
      { error: "Failed to create game" },
      { status: 500 }
    );
  }
}
