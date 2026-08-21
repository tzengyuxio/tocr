import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameCreateSchema } from "@/lib/validators/game";
import { withErrorHandler, paginatedResponse, parsePagination } from "@/lib/api-utils";
import {
  GAME_SORTS,
  gameOrderBy,
  parseGameDirection,
  parseGameSort,
} from "@/lib/game-browse";
import { logEdit } from "@/lib/edit-log";
import { gameNameKeys, nameKey } from "@/lib/name-match";

// GET /api/games - 取得遊戲列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const { page, limit, skip } = parsePagination(searchParams);
  const search = searchParams.get("search") || "";
  const platform = searchParams.get("platform");
  const genre = searchParams.get("genre");
  // 排序的詞彙與公開的遊戲索引共用一份（`game-browse.ts`），兩邊才不會對「文章數
  // 排序」的意思有兩種說法——包括並列時要拿名稱當第二鍵這件事。
  //
  // 只有預設值不同：沒帶 sort 時這裡是名稱，而公開索引是文章數。那邊是逛的，
  // 開頭就給沒人寫過的遊戲沒有意義；這裡是管理清單，找得到某一筆比較重要。
  // 認不得的值要一起落到名稱——不然網址打錯時，後台的預設會變成公開索引的預設。
  const requestedSort = searchParams.get("sort");
  const sort = parseGameSort(
    GAME_SORTS.some((option) => option.value === requestedSort)
      ? requestedSort!
      : "name"
  );
  const direction = parseGameDirection(
    searchParams.get("direction") ?? undefined,
    sort
  );

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { nameEn: { contains: search, mode: "insensitive" as const } },
        { nameOriginal: { contains: search, mode: "insensitive" as const } },
        // 陣列欄位只能整串比對，做不到 contains
        { aliases: { has: search } },
        // 正規化後的精確比對：搜「P.47」找得到存成「P-47」的那筆。與辨識寫入
        // 共用 nameKey()，兩邊對「同一個名字」的定義才會一致。
        { nameKeys: { has: nameKey(search) } },
      ],
    }),
    ...(platform && {
      platforms: { has: platform },
    }),
    ...(genre && {
      genres: { has: genre },
    }),
  };

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy: gameOrderBy(sort, direction),
      skip,
      take: limit,
      include: {
        _count: {
          select: { articleGames: true },
        },
      },
    }),
    prisma.game.count({ where }),
  ]);

  return paginatedResponse(games, total, page, limit);
}, "Fetch games");

// POST /api/games - 新增遊戲
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validatedData = gameCreateSchema.parse(body);

  // 檢查 slug 是否重複
  const existing = await prisma.game.findUnique({
    where: { slug: validatedData.slug },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Slug already exists" },
      { status: 400 }
    );
  }

  const game = await prisma.game.create({
    // Derived, never supplied: the keys are how recognition finds this game
    // again when a table of contents spells it differently.
    data: { ...validatedData, nameKeys: gameNameKeys(validatedData) },
  });

  await logEdit("Game", game.id, "CREATE");

  return NextResponse.json(game, { status: 201 });
}, "Create game");
