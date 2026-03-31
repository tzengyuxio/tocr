import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tagUpdateSchema } from "@/lib/validators/tag";
import { withErrorHandler } from "@/lib/api-utils";

// GET /api/tags/[id] - 取得單一標籤
export const GET = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;
  const searchParams = request.nextUrl.searchParams;
  const all = searchParams.get("all") === "true";

  const tag = await prisma.tag.findUnique({
    where: { id },
    include: {
      articleTags: {
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
        select: { articleTags: true },
      },
    },
  });

  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  return NextResponse.json(tag);
}, "Fetch tag");

// PUT /api/tags/[id] - 更新標籤
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;
  const body = await request.json();
  const validatedData = tagUpdateSchema.parse(body);

  // 檢查 slug 是否與其他標籤重複
  if (validatedData.slug) {
    const existing = await prisma.tag.findFirst({
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

  const tag = await prisma.tag.update({
    where: { id },
    data: validatedData,
  });

  return NextResponse.json(tag);
}, "Update tag");

// DELETE /api/tags/[id] - 刪除標籤
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;

  await prisma.tag.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}, "Delete tag");
