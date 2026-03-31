import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueCreateSchema } from "@/lib/validators/issue";
import { withErrorHandler, paginatedResponse, parsePagination } from "@/lib/api-utils";
import { logEdit } from "@/lib/edit-log";

// GET /api/issues - 取得單期列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const { page, limit, skip } = parsePagination(searchParams);
  const magazineId = searchParams.get("magazineId");

  const where = {
    ...(magazineId && { magazineId }),
  };

  const [issues, total] = await Promise.all([
    prisma.issue.findMany({
      where,
      orderBy: { order: "asc" },
      skip,
      take: limit,
      include: {
        magazine: {
          select: { id: true, name: true },
        },
        _count: {
          select: { articles: true },
        },
      },
    }),
    prisma.issue.count({ where }),
  ]);

  return paginatedResponse(issues, total, page, limit);
}, "Fetch issues");

// POST /api/issues - 新增單期
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validatedData = issueCreateSchema.parse(body);

  // Auto-assign order if not provided
  if (validatedData.order === undefined) {
    const maxOrder = await prisma.issue.aggregate({
      where: { magazineId: validatedData.magazineId },
      _max: { order: true },
    });
    validatedData.order = (maxOrder._max.order ?? -1) + 1;
  }

  const issue = await prisma.issue.create({
    data: validatedData,
  });

  await logEdit("Issue", issue.id, "CREATE");

  return NextResponse.json(issue, { status: 201 });
}, "Create issue");
