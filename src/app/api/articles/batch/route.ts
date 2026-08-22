import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { articleBatchCreateSchema } from "@/lib/validators/article";
import { withErrorHandler } from "@/lib/api-utils";
import { resolveGameIds, resolveTagIds } from "@/lib/resolve-relations";
import { logEditBatch } from "@/lib/edit-log";
import { markIssueChanged } from "@/lib/issue-complete";

// POST /api/articles/batch - 批次建立文章（AI 辨識後使用）
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validatedData = articleBatchCreateSchema.parse(body);

  // 驗證單期存在
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
    // 重跑辨識時整期換掉。關聯是 cascade，所以標籤與遊戲的連結會一併消失 --
    // 呼叫端的確認對話框要講清楚這件事。
    if (validatedData.replaceExisting) {
      await tx.article.deleteMany({ where: { issueId: validatedData.issueId } });
    }

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
      if (articleData.suggestedGames?.length) {
        const gameIds = await resolveGameIds(tx, articleData.suggestedGames);
        for (const [index, gameId] of gameIds.entries()) {
          await tx.articleGame.create({
            data: { articleId: article.id, gameId, isPrimary: index === 0 },
          });
        }
      }

      // 處理建議的標籤關聯
      if (articleData.suggestedTags?.length) {
        const tagIds = await resolveTagIds(
          tx,
          articleData.suggestedTags.map((tag) =>
            typeof tag === "string" ? { name: tag, type: "GENERAL" } : tag
          )
        );
        for (const tagId of tagIds) {
          await tx.articleTag.create({ data: { articleId: article.id, tagId } });
        }
      }

      createdArticles.push(article);
    }

    return createdArticles;
  });

  await logEditBatch(
    "Article",
    result.map((article) => article.id),
    "CREATE",
    { issueId: validatedData.issueId }
  );

  await markIssueChanged(validatedData.issueId);

  // Recognition now lands before anyone has looked at it, so this route cannot
  // claim the contents were reviewed. 標記由單期編輯頁上的按鈕負責。
  return NextResponse.json({
    success: true,
    count: result.length,
    articles: result,
  }, { status: 201 });
}, "Batch create articles");
