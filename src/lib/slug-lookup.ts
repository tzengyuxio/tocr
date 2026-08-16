import { prisma } from "./prisma";

/**
 * Public URLs carry the slug, but the cuid ones are already out there, so the
 * param may be either. The caller redirects when what it was given is not the
 * current slug.
 *
 * Slug wins over id: a renamed slug then simply stops matching and the old
 * one falls through to the id lookup rather than resolving to the wrong row.
 */
export async function resolveSlugParam(
  model: "game" | "tag",
  param: string
): Promise<{ id: string; slug: string } | null> {
  const select = { id: true, slug: true };

  const bySlug =
    model === "game"
      ? await prisma.game.findUnique({ where: { slug: param }, select })
      : await prisma.tag.findUnique({ where: { slug: param }, select });
  if (bySlug) return bySlug;

  return model === "game"
    ? prisma.game.findUnique({ where: { id: param }, select })
    : prisma.tag.findUnique({ where: { id: param }, select });
}
