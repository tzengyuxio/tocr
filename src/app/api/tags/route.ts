import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tagCreateSchema } from "@/lib/validators/tag";
import { withErrorHandler, paginatedResponse } from "@/lib/api-utils";

// GET /api/tags - 取得標籤列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const type = searchParams.get("type");
  const search = searchParams.get("search") || "";

  const where = {
    ...(type && { type: type as "GENERAL" | "PERSON" | "EVENT" | "SERIES" | "COMPANY" | "PLATFORM" }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { slug: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [tags, total] = await Promise.all([
    prisma.tag.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: { articleTags: true },
        },
      },
    }),
    prisma.tag.count({ where }),
  ]);

  return paginatedResponse(tags, total, page, limit);
}, "Fetch tags");

// POST /api/tags - 新增標籤
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validatedData = tagCreateSchema.parse(body);

  // 檢查 slug 是否重複
  const existing = await prisma.tag.findUnique({
    where: { slug: validatedData.slug },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Slug already exists" },
      { status: 400 }
    );
  }

  const tag = await prisma.tag.create({
    data: validatedData,
  });

  return NextResponse.json(tag, { status: 201 });
}, "Create tag");
