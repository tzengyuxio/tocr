import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { articleUpdateSchema } from "@/lib/validators/article";
import { withErrorHandler } from "@/lib/api-utils";
import { resolveGameIds, resolveTagIds } from "@/lib/resolve-relations";
import { logEdit } from "@/lib/edit-log";
import { diffChanges, diffIds } from "@/lib/edit-log-diff";
import { markIssueChanged } from "@/lib/issue-complete";

// GET /api/articles/[id] - 取得單一文章
export const GET = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;

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
}, "Fetch article");

// PUT /api/articles/[id] - 更新文章
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;
  const body = await request.json();

  // 分離關聯資料。id 版給 picker 用，名稱版給行內編輯用（沒有的會建起來）。
  const { gameIds, tagIds, games, tags, ...articleData } = body;

  // 兩種寫法只能擇一 -- 同時給而內容不一致時，沒有哪一邊該贏。
  if (
    (games !== undefined && gameIds !== undefined) ||
    (tags !== undefined && tagIds !== undefined)
  ) {
    return NextResponse.json(
      { error: "關聯只能以 id 或名稱其中一種方式設定" },
      { status: 400 }
    );
  }

  const validatedData = articleUpdateSchema.parse(articleData);

  // The relation ids come along so the log can show a tag-only or game-only
  // edit; the row itself does not change for those.
  const before = await prisma.article.findUnique({
    where: { id },
    include: {
      articleGames: { select: { gameId: true, isPrimary: true } },
      articleTags: { select: { tagId: true } },
    },
  });

  // 名稱要在 transaction 內解析，但編輯紀錄在 transaction 外算，所以宣告在外層。
  let resolvedGameIds: string[] | undefined;
  let resolvedTagIds: string[] | undefined;

  // 使用 transaction 更新文章和關聯
  const article = await prisma.$transaction(async (tx) => {
    // 更新文章基本資料
    const updated = await tx.article.update({
      where: { id },
      data: validatedData,
    });

    resolvedGameIds =
      games !== undefined ? await resolveGameIds(tx, games) : gameIds;

    // 如果有提供遊戲，更新遊戲關聯
    if (resolvedGameIds !== undefined) {
      // 刪除現有關聯
      await tx.articleGame.deleteMany({
        where: { articleId: id },
      });
      // 建立新關聯
      if (resolvedGameIds.length > 0) {
        await tx.articleGame.createMany({
          data: resolvedGameIds.map((gameId: string, index: number) => ({
            articleId: id,
            gameId,
            isPrimary: index === 0, // 第一個為主要遊戲
          })),
        });
      }
    }

    resolvedTagIds = tags !== undefined ? await resolveTagIds(tx, tags) : tagIds;

    // 如果有提供標籤，更新標籤關聯
    if (resolvedTagIds !== undefined) {
      // 刪除現有關聯
      await tx.articleTag.deleteMany({
        where: { articleId: id },
      });
      // 建立新關聯
      if (resolvedTagIds.length > 0) {
        await tx.articleTag.createMany({
          data: resolvedTagIds.map((tagId: string) => ({
            articleId: id,
            tagId,
          })),
        });
      }
    }

    return updated;
  });

  const changes: Record<string, unknown> = diffChanges(before, article);
  if (resolvedGameIds !== undefined) {
    const beforeGames = before?.articleGames ?? [];
    const diff = diffIds(beforeGames.map((g) => g.gameId), resolvedGameIds);
    if (diff) changes.gameIds = diff;

    // The write above makes the first id the primary game, so the same games
    // in a new order still changes something the set diff cannot see.
    const primaryFrom = beforeGames.find((g) => g.isPrimary)?.gameId ?? null;
    const primaryTo = resolvedGameIds[0] ?? null;
    if (primaryFrom !== primaryTo) {
      changes.primaryGameId = { from: primaryFrom, to: primaryTo };
    }
  }
  if (resolvedTagIds !== undefined) {
    const diff = diffIds(
      before?.articleTags.map((t) => t.tagId) ?? [],
      resolvedTagIds
    );
    if (diff) changes.tagIds = diff;
  }

  await logEdit("Article", id, "UPDATE", changes);
  // 同一個 changes 決定要不要讓完備失效——按了儲存但什麼都沒改，紀錄不會留一行，
  // 標記也不該掉。判斷的依據是寫入前後的資料列，不是請求送了哪些欄位。
  if (Object.keys(changes).length > 0) {
    await markIssueChanged(article.issueId);
  }

  return NextResponse.json(article);
}, "Update article");

// DELETE /api/articles/[id] - 刪除文章
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;

  // delete() 回傳被刪的那筆，正好用來記下它叫什麼 -- 紀錄活得比資料久，
  // 只留 id 的話事後看不出刪掉的是什麼。
  const deleted = await prisma.article.delete({
    where: { id },
  });

  await logEdit("Article", id, "DELETE", { title: { from: deleted.title, to: null } });
  await markIssueChanged(deleted.issueId);

  return NextResponse.json({ success: true });
}, "Delete article");
