import { type Prisma, TagType } from "@prisma/client";
import type { TagInput } from "./tag-input";
import { ensureUniqueSlug, slugify } from "./slugify";

/** The transaction client both callers hand in. */
export type TxClient = Prisma.TransactionClient;

/** Ids in input order, so the caller can treat the first as the primary game. */
export async function resolveGameIds(
  tx: TxClient,
  names: string[]
): Promise<string[]> {
  const ids: string[] = [];

  for (const name of names) {
    const existing = await tx.game.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: "insensitive" } },
          { nameEn: { equals: name, mode: "insensitive" } },
          { nameOriginal: { equals: name, mode: "insensitive" } },
        ],
      },
    });

    if (existing) {
      ids.push(existing.id);
      continue;
    }

    const created = await tx.game.create({
      data: { name, slug: await ensureUniqueSlug(tx, "game", slugify(name) || "game") },
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
    const existing = await tx.tag.findFirst({
      where: { name: { equals: tag.name, mode: "insensitive" } },
    });

    if (existing) {
      ids.push(existing.id);
      continue;
    }

    const type = Object.values(TagType).includes(tag.type as TagType)
      ? (tag.type as TagType)
      : TagType.GENERAL;

    const created = await tx.tag.create({
      data: {
        name: tag.name,
        slug: await ensureUniqueSlug(tx, "tag", slugify(tag.name) || "tag"),
        type,
      },
    });
    ids.push(created.id);
  }

  return ids;
}
