import type { Prisma } from "@prisma/client";
import type { EditActor } from "./edit-log";
import { gameNameKeys } from "./name-match";

/**
 * Folding a duplicate game entry into the one that survives.
 *
 * The same game gets entered twice when two issues' tables of contents spell it
 * differently (`P.47` and `P-47`); an identical spelling would have matched on
 * creation. What to merge and what to strike out instead is in
 * docs/data-conventions.md under 「重複條目怎麼歸類」.
 *
 * The planning half is pure so the decision can be shown to an editor before
 * anything is written -- the losing row is deleted for real, and there is no
 * id ledger to trace it back through afterwards.
 */

/** One row of `article_games`, as much of it as the merge has to reason about. */
export interface MergeLink {
  articleId: string;
  /** The article's main game. An article has at most one. */
  isPrimary: boolean;
}

/**
 * The fields a merge has to carry across, beyond the names.
 *
 * The losing row is deleted outright, so anything recorded only there is gone
 * for good -- and the edit log names the entry, not its contents. That cost
 * nothing while these columns were empty (platforms was empty on all 6,744
 * rows until 2026-09-20), which is why the merge never handled them; now that
 * they are being filled, every merge would quietly drop whichever values the
 * losing spelling happened to carry.
 */
export interface MergeableFields {
  platforms: string[];
  genres: string[];
  nameEn: string | null;
  nameOriginal: string | null;
  releaseDate: Date | null;
  developer: string | null;
  publisher: string | null;
  coverImage: string | null;
  description: string | null;
}

/** One side of a merge: enough of a Game to decide what the merge would do. */
export interface MergeCandidate extends MergeableFields {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
  createdAt: Date;
  /** Articles this entry is linked to, through `article_games`. */
  links: MergeLink[];
}

export interface GameMergePlan {
  keeperId: string;
  loserId: string;
  /** Links that move across, because the keeper has no row for that article. */
  movedArticleIds: string[];
  /** Links dropped: the keeper is already on that article, and the pair is unique. */
  discardedLinkCount: number;
  /**
   * Articles whose keeper row has to be promoted to primary, because the row
   * being dropped was the primary one.
   */
  promotedArticleIds: string[];
  /** What the keeper's `aliases` becomes. */
  mergedAliases: string[];
  /**
   * Fields the keeper gains from the loser. Only what actually changes, so an
   * editor previewing the merge sees the additions rather than the whole row,
   * and an empty object means the merge touches nothing but names and links.
   */
  carriedFields: Partial<MergeableFields>;
}

const ARRAY_FIELDS = ["platforms", "genres"] as const;
const SCALAR_FIELDS = [
  "nameEn", "nameOriginal", "releaseDate",
  "developer", "publisher", "coverImage", "description",
] as const;

/**
 * What the keeper gains from the loser.
 *
 * Arrays union: a game entered twice under two spellings can have had a
 * platform recorded on either row, and both are true of the same game.
 * Scalars only fill a blank -- the keeper's value is an editor's choice and
 * the loser's is the one being discarded, so a conflict resolves towards the
 * row that survives. Nothing here overwrites.
 */
function carryFields(
  keeper: MergeableFields,
  loser: MergeableFields
): Partial<MergeableFields> {
  const carried: Partial<MergeableFields> = {};

  for (const field of ARRAY_FIELDS) {
    const missing = loser[field].filter((value) => !keeper[field].includes(value));
    if (missing.length > 0) carried[field] = [...keeper[field], ...missing];
  }

  for (const field of SCALAR_FIELDS) {
    if (keeper[field] === null || keeper[field] === "") {
      if (loser[field] !== null && loser[field] !== "") {
        // Each scalar has its own type; the loop is what makes this opaque.
        (carried as Record<string, unknown>)[field] = loser[field];
      }
    }
  }

  return carried;
}

/**
 * What to select to build a `MergeCandidate`.
 *
 * Shared by both callers on purpose: the API route and scripts/merge-game.ts
 * each used to carry their own list, and a field added to MergeableFields but
 * forgotten in one of them would silently arrive as undefined.
 */
export const MERGE_CANDIDATE_SELECT = {
  id: true,
  name: true,
  slug: true,
  aliases: true,
  createdAt: true,
  platforms: true,
  genres: true,
  nameEn: true,
  nameOriginal: true,
  releaseDate: true,
  developer: true,
  publisher: true,
  coverImage: true,
  description: true,
  articleGames: { select: { articleId: true, isPrimary: true } },
} as const;

/** What `MERGE_CANDIDATE_SELECT` brings back, before `articleGames` is renamed. */
export type LoadedMergeCandidate = MergeableFields & {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
  createdAt: Date;
  articleGames: MergeLink[];
};

/** The one place `articleGames` becomes `links`. */
export function toMergeCandidate(game: LoadedMergeCandidate): MergeCandidate {
  const { articleGames, ...rest } = game;
  return { ...rest, links: articleGames };
}

/**
 * What merging `loser` into `keeper` would do. Writes nothing.
 */
export function planGameMerge(
  keeper: MergeCandidate,
  loser: MergeCandidate
): GameMergePlan {
  if (keeper.id === loser.id) {
    throw new Error("無法把條目合併到自己");
  }

  const keeperLinks = new Map(keeper.links.map((link) => [link.articleId, link]));
  const movedArticleIds = loser.links
    .filter((link) => !keeperLinks.has(link.articleId))
    .map((link) => link.articleId);

  // A dropped row takes its isPrimary with it, so an article whose main game
  // was recorded on the losing row would come out of the merge with no main
  // game at all. Moved rows keep their own flag and need no correction.
  const promotedArticleIds = loser.links
    .filter((link) => link.isPrimary && keeperLinks.get(link.articleId)?.isPrimary === false)
    .map((link) => link.articleId);

  // The losing spelling is a name the magazines actually printed. Dropping it
  // means nobody can search for it again.
  const mergedAliases = [
    ...new Set([...keeper.aliases, loser.name, ...loser.aliases]),
  ].filter((alias) => alias !== keeper.name);

  return {
    keeperId: keeper.id,
    loserId: loser.id,
    movedArticleIds,
    discardedLinkCount: loser.links.length - movedArticleIds.length,
    promotedArticleIds,
    mergedAliases,
    carriedFields: carryFields(keeper, loser),
  };
}

/** Just enough of either side to apply the convention on which one to keep. */
export interface KeeperCandidate {
  id: string;
  createdAt: Date;
  articleCount: number;
}

/**
 * Which of the two to keep, as a starting point an editor can override.
 *
 * The earlier entry wins: it is the id the rest of the catalogue has been
 * accumulating against. When a backfill created both in the same batch that
 * tells us nothing, so the one with more articles wins instead.
 *
 * Deliberately narrower than MergeCandidate: the admin list has each game's
 * date and article count already, so it can preselect the radio button without
 * asking the server first.
 */
export function suggestKeeper<T extends KeeperCandidate>(a: T, b: T): T {
  if (a.createdAt.getTime() !== b.createdAt.getTime()) {
    return a.createdAt < b.createdAt ? a : b;
  }
  return b.articleCount > a.articleCount ? b : a;
}

/**
 * Carry out a plan. Must run inside a transaction: a half-applied merge leaves
 * articles pointing at a game that is about to be deleted.
 */
export async function applyGameMerge(
  tx: Prisma.TransactionClient,
  plan: GameMergePlan,
  author: EditActor,
  loserName: string
): Promise<void> {
  for (const articleId of plan.movedArticleIds) {
    await tx.articleGame.updateMany({
      where: { articleId, gameId: plan.loserId },
      data: { gameId: plan.keeperId },
    });
  }

  if (plan.promotedArticleIds.length > 0) {
    await tx.articleGame.updateMany({
      where: { articleId: { in: plan.promotedArticleIds }, gameId: plan.keeperId },
      data: { isPrimary: true },
    });
  }

  // Read back rather than carried in the plan: the plan says what the merge
  // changes, and the keeper's other names are not part of that.
  const keeper = await tx.game.findUniqueOrThrow({
    where: { id: plan.keeperId },
    select: { name: true, nameEn: true, nameOriginal: true },
  });

  await tx.game.update({
    where: { id: plan.keeperId },
    // The keys move with the aliases. Without this the losing spelling stays
    // searchable but stops being recognisable, and the next issue that prints
    // it creates the row again -- undoing the merge one table of contents later.
    data: {
      ...plan.carriedFields,
      aliases: plan.mergedAliases,
      nameKeys: gameNameKeys({ ...keeper, aliases: plan.mergedAliases }),
    },
  });

  // The log outlives the row, so it has to say what was deleted, not just which
  // id. `mergedInto` is the only breadcrumb back to where the articles went.
  await tx.editLog.create({
    data: {
      userId: author.userId,
      entityType: "Game",
      entityId: plan.loserId,
      action: "DELETE",
      changes: {
        reason: "merged duplicate",
        mergedInto: plan.keeperId,
        name: { from: loserName, to: null },
        movedArticleLinks: plan.movedArticleIds.length,
        // Which of the deleted row's values live on, so the log says what was
        // kept as well as what went.
        carriedFields: Object.keys(plan.carriedFields),
        discardedDuplicateLinks: plan.discardedLinkCount,
        promotedPrimaryLinks: plan.promotedArticleIds.length,
      },
      via: author.via,
    },
  });

  // Deleting cascades the links left behind -- those are the duplicates the
  // keeper already had.
  await tx.game.delete({ where: { id: plan.loserId } });
}
