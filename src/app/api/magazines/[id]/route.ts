import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { magazineUpdateSchema } from "@/lib/validators/magazine";

// GET /api/magazines/[id] - 取得單一期刊
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const magazine = await prisma.magazine.findUnique({
      where: { id },
      include: {
        issues: {
          orderBy: { publishDate: "desc" },
          take: 10,
        },
        _count: {
          select: { issues: true },
        },
      },
    });

    if (!magazine) {
      return NextResponse.json(
        { error: "Magazine not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(magazine);
  } catch (error) {
    console.error("Failed to fetch magazine:", error);
    return NextResponse.json(
      { error: "Failed to fetch magazine" },
      { status: 500 }
    );
  }
}

// PUT /api/magazines/[id] - 更新期刊
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = magazineUpdateSchema.parse(body);

    const magazine = await prisma.magazine.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(magazine);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to update magazine:", error);
    return NextResponse.json(
      { error: "Failed to update magazine" },
      { status: 500 }
    );
  }
}

// DELETE /api/magazines/[id] - 刪除期刊
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.magazine.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete magazine:", error);
    return NextResponse.json(
      { error: "Failed to delete magazine" },
      { status: 500 }
    );
  }
}
