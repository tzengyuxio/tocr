import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { articleCreateSchema } from "@/lib/validators/article";
import { withErrorHandler, paginatedResponse, parsePagination } from "@/lib/api-utils";
import { logEdit } from "@/lib/edit-log";
import { markIssueChanged } from "@/lib/issue-complete";

// GET /api/articles - 取得文章列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const { page, limit, skip } = parsePagination(searchParams);
  const issueId = searchParams.get("issueId");
  const magazineId = searchParams.get("magazineId");
  const search = searchParams.get("search") || "";
  const gameId = searchParams.get("gameId");
  const tagId = searchParams.get("tagId");

  const where = {
    ...(issueId && { issueId }),
    ...(magazineId && {
      issue: { magazineId },
    }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { subtitle: { contains: search, mode: "insensitive" as const } },
        { summary: { contains: search, mode: "insensitive" as const } },
        { authors: { has: search } },
      ],
    }),
    ...(gameId && {
      articleGames: {
        some: { gameId },
      },
    }),
    ...(tagId && {
      articleTags: {
        some: { tagId },
      },
    }),
  };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      // Nulls last: undated issues have no place on a timeline.
      // 同一天出刊的兩本刊會拿到同一組 (publishSort, sortOrder)，並列沒有
      // tie-breaker 時 offset 分頁會重複與漏列，所以最後補上 id。
      orderBy: [
        { issue: { publishSort: { sort: "desc", nulls: "last" } } },
        { sortOrder: "asc" },
        { id: "asc" },
      ],
      skip,
      take: limit,
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
            game: {
              select: { id: true, name: true },
            },
          },
        },
        articleTags: {
          include: {
            tag: {
              select: { id: true, name: true, type: true },
            },
          },
        },
      },
    }),
    prisma.article.count({ where }),
  ]);

  return paginatedResponse(articles, total, page, limit);
}, "Fetch articles");

// POST /api/articles - 新增文章
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validatedData = articleCreateSchema.parse(body);

  const article = await prisma.article.create({
    data: validatedData,
  });

  await logEdit("Article", article.id, "CREATE");
  // 目錄是這一期資料的一部分，所以動到文章就動到了「完備」的前提。
  await markIssueChanged(article.issueId);

  return NextResponse.json(article, { status: 201 });
}, "Create article");
