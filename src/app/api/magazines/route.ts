import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { magazineCreateSchema } from "@/lib/validators/magazine";
import { withErrorHandler, paginatedResponse, parsePagination } from "@/lib/api-utils";
import { logEdit } from "@/lib/edit-log";

// GET /api/magazines - 取得期刊列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const { page, limit, skip } = parsePagination(searchParams);
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
      skip,
      take: limit,
      include: {
        _count: {
          select: { issues: true },
        },
      },
    }),
    prisma.magazine.count({ where }),
  ]);

  return paginatedResponse(magazines, total, page, limit);
}, "Fetch magazines");

// POST /api/magazines - 新增期刊
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validatedData = magazineCreateSchema.parse(body);

  const magazine = await prisma.magazine.create({
    data: validatedData,
  });

  await logEdit("Magazine", magazine.id, "CREATE");

  return NextResponse.json(magazine, { status: 201 });
}, "Create magazine");
