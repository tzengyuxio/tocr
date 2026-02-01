import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { magazineCreateSchema } from "@/lib/validators/magazine";

// GET /api/magazines - 取得期刊列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { nameEn: { contains: search, mode: "insensitive" as const } },
          { publisher: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(isActive !== null && isActive !== undefined && {
        isActive: isActive === "true",
      }),
    };

    const [magazines, total] = await Promise.all([
      prisma.magazine.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { issues: true },
          },
        },
      }),
      prisma.magazine.count({ where }),
    ]);

    return NextResponse.json({
      data: magazines,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch magazines:", error);
    return NextResponse.json(
      { error: "Failed to fetch magazines" },
      { status: 500 }
    );
  }
}

// POST /api/magazines - 新增期刊
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = magazineCreateSchema.parse(body);

    const magazine = await prisma.magazine.create({
      data: validatedData,
    });

    return NextResponse.json(magazine, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to create magazine:", error);
    return NextResponse.json(
      { error: "Failed to create magazine" },
      { status: 500 }
    );
  }
}
