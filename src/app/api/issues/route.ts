import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueCreateSchema } from "@/lib/validators/issue";

// GET /api/issues - 取得單期列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const magazineId = searchParams.get("magazineId");

    const where = {
      ...(magazineId && { magazineId }),
    };

    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        orderBy: { order: "asc" },
        skip: (page - 1) * limit,
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

    return NextResponse.json({
      data: issues,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch issues:", error);
    return NextResponse.json(
      { error: "Failed to fetch issues" },
      { status: 500 }
    );
  }
}

// POST /api/issues - 新增單期
export async function POST(request: NextRequest) {
  try {
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

    return NextResponse.json(issue, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to create issue:", error);
    return NextResponse.json(
      { error: "Failed to create issue" },
      { status: 500 }
    );
  }
}
