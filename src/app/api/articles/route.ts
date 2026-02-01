import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { articleCreateSchema } from "@/lib/validators/article";

// GET /api/articles - 取得文章列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const issueId = searchParams.get("issueId");
    const magazineId = searchParams.get("magazineId");
    const search = searchParams.get("search") || "";
    const gameId = searchParams.get("gameId");
    const tagId = searchParams.get("tagId");

    const where = {
      ...(issueId && { issueId }),
      ...(magazineId && {
        issue: { magazineId },
      }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { subtitle: { contains: search, mode: "insensitive" as const } },
          { summary: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(gameId && {
        articleGames: {
          some: { gameId },
        },
      }),
      ...(tagId && {
        articleTags: {
          some: { tagId },
        },
      }),
    };

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: [{ issue: { publishDate: "desc" } }, { sortOrder: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
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
          articleGames: {
            include: {
              game: {
                select: { id: true, name: true },
              },
            },
          },
          articleTags: {
            include: {
              tag: {
                select: { id: true, name: true, type: true },
              },
            },
          },
        },
      }),
      prisma.article.count({ where }),
    ]);

    return NextResponse.json({
      data: articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}

// POST /api/articles - 新增文章
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = articleCreateSchema.parse(body);

    const article = await prisma.article.create({
      data: validatedData,
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to create article:", error);
    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 }
    );
  }
}
