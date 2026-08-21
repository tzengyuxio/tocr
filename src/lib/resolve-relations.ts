import { type Prisma, TagType } from "@prisma/client";
import type { TagInput } from "./tag-input";
import { nameKey, tagNameKey } from "./name-match";
import { ensureUniqueSlug, slugify } from "./slugify";

/** The transaction client both callers hand in. */
export type TxClient = Prisma.TransactionClient;

/**
 * Ids in input order, so the caller can treat the first as the primary game.
 *
 * A name off a table of contents is whatever that issue printed, and the next
 * issue prints it differently. Matching used to be exact equality on the three
 * name columns, which meant 蝙蝠俠。電影版 and 蝙蝠俠·電影版 became two games,
 * and a name that had been merged away came back as a new row the moment
 * another issue used it. `nameKeys` is the normalised form of every name a
 * game answers to, aliases included -- one ruler, shared with the search box.
 */
export async function resolveGameIds(
  tx: TxClient,
  names: string[]
): Promise<string[]> {
  const ids: string[] = [];

  for (const name of names) {
    const key = nameKey(name);
    // A name with nothing to key on (punctuation only) would match every game
    // whose keys are empty, so it never looks anything up.
    const existing = key
      ? await tx.game.findFirst({ where: { nameKeys: { has: key } } })
      : null;

    if (existing) {
      ids.push(existing.id);
      continue;
    }

    const created = await tx.game.create({
      data: {
        name,
        slug: await ensureUniqueSlug(tx, "game", slugify(name) || "game"),
        nameKeys: key ? [key] : [],
      },
    });
    ids.push(created.id);
  }

  return ids;
}

export async function resolveTagIds(
  tx: TxClient,
  tags: TagInput[]
): Promise<string[]> {
  const ids: string[] = [];

  for (const tag of tags) {
    const type = Object.values(TagType).includes(tag.type as TagType)
      ? (tag.type as TagType)
      : TagType.GENERAL;
    const key = tagNameKey(tag.name);

    // Type and name together: for a tag the type *is* the disambiguating
    // dimension, so SERIES:三國志 and GENERAL:三國志 are two tags rather than
    // one with a suffix. See docs/data-conventions.md.
    const existing = key
      ? await tx.tag.findFirst({ where: { nameKey: key, type } })
      : null;

    if (existing) {
      ids.push(existing.id);
      continue;
    }

    const created = await tx.tag.create({
      data: {
        name: tag.name,
        nameKey: key,
        slug: await ensureUniqueSlug(tx, "tag", slugify(tag.name) || "tag"),
        type,
      },
    });
    ids.push(created.id);
  }

  return ids;
}
