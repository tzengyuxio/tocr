import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameMergeSchema } from "@/lib/validators/game";
import { withErrorHandler } from "@/lib/api-utils";
import { resolveAuthor } from "@/lib/edit-log";
import { applyGameMerge, planGameMerge, type MergeCandidate } from "@/lib/merge-game";

const CANDIDATE_SELECT = {
  id: true,
  name: true,
  slug: true,
  aliases: true,
  createdAt: true,
  articleGames: { select: { articleId: true, isPrimary: true } },
} as const;

type LoadedGame = {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
  createdAt: Date;
  articleGames: { articleId: string; isPrimary: boolean }[];
};

function toCandidate(game: LoadedGame): MergeCandidate {
  return {
    id: game.id,
    name: game.name,
    slug: game.slug,
    aliases: game.aliases,
    createdAt: game.createdAt,
    links: game.articleGames,
  };
}

/**
 * POST /api/games/[id]/merge - 把重複的條目併進這一筆
 *
 * The id in the path is the entry that survives; `loserId` in the body is the
 * duplicate, and it is deleted. `dryRun` answers what would happen without
 * writing, which is what the confirmation dialog shows -- the delete is real
 * and there is nothing to undo it with.
 */
export const POST = withErrorHandler(async (request: NextRequest, context) => {
  const { id: keeperId } = await context!.params;
  const { loserId, dryRun } = gameMergeSchema.parse(await request.json());

  if (keeperId === loserId) {
    return NextResponse.json({ error: "無法把條目合併到自己" }, { status: 400 });
  }

  const [keeper, loser] = await Promise.all([
    prisma.game.findUnique({ where: { id: keeperId }, select: CANDIDATE_SELECT }),
    prisma.game.findUnique({ where: { id: loserId }, select: CANDIDATE_SELECT }),
  ]);

  if (!keeper || !loser) {
    return NextResponse.json({ error: "找不到要合併的條目" }, { status: 404 });
  }

  const plan = planGameMerge(toCandidate(keeper), toCandidate(loser));
  // The dialog names both sides, and after the merge the losing name only
  // exists in this response.
  const summary = {
    ...plan,
    keeperName: keeper.name,
    loserName: loser.name,
    movedArticleLinks: plan.movedArticleIds.length,
    promotedPrimaryLinks: plan.promotedArticleIds.length,
  };

  if (dryRun) {
    return NextResponse.json({ applied: false, ...summary });
  }

  const author = await resolveAuthor();
  if (!author) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.$transaction((tx) => applyGameMerge(tx, plan, author, loser.name));

  return NextResponse.json({ applied: true, ...summary });
}, "Merge games");
