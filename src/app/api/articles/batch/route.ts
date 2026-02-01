import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { articleBatchCreateSchema } from "@/lib/validators/article";

// POST /api/articles/batch - 批次建立文章（AI 辨識後使用）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = articleBatchCreateSchema.parse(body);

    // 驗證期數存在
    const issue = await prisma.issue.findUnique({
      where: { id: validatedData.issueId },
    });

    if (!issue) {
      return NextResponse.json(
        { error: "Issue not found" },
        { status: 404 }
      );
    }

    // 使用 transaction 批次建立
    const result = await prisma.$transaction(async (tx) => {
      const createdArticles = [];

      for (const articleData of validatedData.articles) {
        // 建立文章
        const article = await tx.article.create({
          data: {
            issueId: validatedData.issueId,
            title: articleData.title,
            subtitle: articleData.subtitle,
            authors: articleData.authors,
            category: articleData.category,
            pageStart: articleData.pageStart,
            pageEnd: articleData.pageEnd,
            summary: articleData.summary,
            sortOrder: articleData.sortOrder,
          },
        });

        // 處理建議的遊戲關聯
        if (articleData.suggestedGames && articleData.suggestedGames.length > 0) {
          for (const gameName of articleData.suggestedGames) {
            // 查找或建立遊戲
            let game = await tx.game.findFirst({
              where: {
                OR: [
                  { name: { equals: gameName, mode: "insensitive" } },
                  { nameEn: { equals: gameName, mode: "insensitive" } },
                  { nameOriginal: { equals: gameName, mode: "insensitive" } },
                ],
              },
            });

            if (!game) {
              // 建立新遊戲
              const slug = gameName
                .toLowerCase()
                .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
                .replace(/^-|-$/g, "");

              game = await tx.game.create({
                data: {
                  name: gameName,
                  slug: `${slug}-${Date.now()}`,
                },
              });
            }

            // 建立關聯
            await tx.articleGame.create({
              data: {
                articleId: article.id,
                gameId: game.id,
                isPrimary: articleData.suggestedGames.indexOf(gameName) === 0,
              },
            });
          }
        }

        // 處理建議的標籤關聯
        if (articleData.suggestedTags && articleData.suggestedTags.length > 0) {
          for (const tagName of articleData.suggestedTags) {
            // 查找或建立標籤
            let tag = await tx.tag.findFirst({
              where: {
                name: { equals: tagName, mode: "insensitive" },
              },
            });

            if (!tag) {
              // 建立新標籤
              const slug = tagName
                .toLowerCase()
                .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
                .replace(/^-|-$/g, "");

              tag = await tx.tag.create({
                data: {
                  name: tagName,
                  slug: `${slug}-${Date.now()}`,
                  type: "GENERAL",
                },
              });
            }

            // 建立關聯
            await tx.articleTag.create({
              data: {
                articleId: article.id,
                tagId: tag.id,
              },
            });
          }
        }

        createdArticles.push(article);
      }

      return createdArticles;
    });

    return NextResponse.json({
      success: true,
      count: result.length,
      articles: result,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to batch create articles:", error);
    return NextResponse.json(
      { error: "Failed to batch create articles" },
      { status: 500 }
    );
  }
}
