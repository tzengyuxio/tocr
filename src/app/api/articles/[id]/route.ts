import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { articleUpdateSchema } from "@/lib/validators/article";

// GET /api/articles/[id] - 取得單一文章
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const article = await prisma.article.findUnique({
      where: { id },
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
            game: true,
          },
        },
        articleTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("Failed to fetch article:", error);
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 }
    );
  }
}

// PUT /api/articles/[id] - 更新文章
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 分離關聯資料
    const { gameIds, tagIds, ...articleData } = body;
    const validatedData = articleUpdateSchema.parse(articleData);

    // 使用 transaction 更新文章和關聯
    const article = await prisma.$transaction(async (tx) => {
      // 更新文章基本資料
      const updated = await tx.article.update({
        where: { id },
        data: validatedData,
      });

      // 如果有提供 gameIds，更新遊戲關聯
      if (gameIds !== undefined) {
        // 刪除現有關聯
        await tx.articleGame.deleteMany({
          where: { articleId: id },
        });
        // 建立新關聯
        if (gameIds.length > 0) {
          await tx.articleGame.createMany({
            data: gameIds.map((gameId: string, index: number) => ({
              articleId: id,
              gameId,
              isPrimary: index === 0, // 第一個為主要遊戲
            })),
          });
        }
      }

      // 如果有提供 tagIds，更新標籤關聯
      if (tagIds !== undefined) {
        // 刪除現有關聯
        await tx.articleTag.deleteMany({
          where: { articleId: id },
        });
        // 建立新關聯
        if (tagIds.length > 0) {
          await tx.articleTag.createMany({
            data: tagIds.map((tagId: string) => ({
              articleId: id,
              tagId,
            })),
          });
        }
      }

      return updated;
    });

    return NextResponse.json(article);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to update article:", error);
    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 }
    );
  }
}

// DELETE /api/articles/[id] - 刪除文章
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.article.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete article:", error);
    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 }
    );
  }
}
