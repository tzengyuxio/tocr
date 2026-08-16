import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { articleBatchCreateSchema } from "@/lib/validators/article";
import { withErrorHandler } from "@/lib/api-utils";
import { resolveGameIds, resolveTagIds } from "@/lib/resolve-relations";
import { logEdit, logEditBatch } from "@/lib/edit-log";
import { isValidApiToken } from "@/lib/api-token";

// POST /api/articles/batch - 批次建立文章（AI 辨識後使用）
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validatedData = articleBatchCreateSchema.parse(body);

  // 驗證單期存在
  const issue = await prisma.issue.findUnique({
    where: { id: validatedData.issueId },
    include: { _count: { select: { articles: true } } },
  });

  if (!issue) {
    return NextResponse.json(
      { error: "Issue not found" },
      { status: 404 }
    );
  }

  // 複查頁載入的是存下來的辨識結果，不是這期現有的文章，而這支 route 從頭到尾
  // 只有 create -- 所以再複查一次、再存一次，這期就多出一整份文章。真正的解法
  // 是讓複查直接編輯現有文章，在那之前先擋在這裡，由呼叫端明確確認。
  const existingCount = issue._count?.articles ?? 0;
  if (existingCount > 0 && !validatedData.confirmDuplicate) {
    return NextResponse.json(
      {
        error: `這期已經有 ${existingCount} 篇文章，再存一次會多出一整份重複的內容`,
        existingCount,
      },
      { status: 409 }
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

  // Saving here is the last step of a person comparing the recognised list
  // against the scan, so the issue leaves the review queue. Token writes are
  // unattended and must not claim a human checked anything -- the same rule
  // the issue route applies. An existing timestamp is left alone: it records
  // when the contents were first confirmed.
  const isHuman = !isValidApiToken(request.headers.get("authorization"));
  const markedReviewed = isHuman && !issue.tocReviewedAt;
  if (markedReviewed) {
    await prisma.issue.update({
      where: { id: validatedData.issueId },
      data: { tocReviewedAt: new Date() },
    });
    await logEdit("Issue", validatedData.issueId, "UPDATE", {
      tocReviewedAt: { from: null, to: new Date().toISOString() },
    });
  }

  return NextResponse.json({
    success: true,
    count: result.length,
    articles: result,
    markedReviewed,
  }, { status: 201 });
}, "Batch create articles");
