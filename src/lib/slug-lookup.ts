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
  model: "game" | "tag" | "magazine",
  param: string
): Promise<{ id: string; slug: string } | null> {
  const select = { id: true, slug: true };
  const slug = decodeParam(param);

  // Spelled out per model rather than indexed: the delegates have different
  // generic signatures, so prisma[model] resolves to a union TypeScript will
  // not call. Same reason as ensureUniqueSlug in slugify.ts.
  const bySlug =
    model === "game"
      ? await prisma.game.findUnique({ where: { slug }, select })
      : model === "tag"
        ? await prisma.tag.findUnique({ where: { slug }, select })
        : await prisma.magazine.findUnique({ where: { slug }, select });
  if (bySlug) return bySlug;

  return model === "game"
    ? prisma.game.findUnique({ where: { id: slug }, select })
    : model === "tag"
      ? prisma.tag.findUnique({ where: { id: slug }, select })
      : prisma.magazine.findUnique({ where: { id: slug }, select });
}

/**
 * An issue's slug only has to be unique within its magazine, so the lookup is
 * scoped -- the magazine is already in the path.
 *
 * Three ways in, one canonical way out. The issue number is accepted because a
 * reader holding the physical magazine reads the number off it: 電玩通 prints
 * 第468期 on the back while the URL carries the cover date, and
 * @@unique([magazineId, issueNumber]) makes that lookup exact for free. The
 * cuid is accepted because those URLs are already out there.
 */
export async function resolveIssueParam(
  magazineId: string,
  param: string
): Promise<{ id: string; slug: string } | null> {
  const select = { id: true, slug: true };
  const value = decodeParam(param);

  const bySlug = await prisma.issue.findUnique({
    where: { magazineId_slug: { magazineId, slug: value } },
    select,
  });
  if (bySlug) return bySlug;

  const byNumber = await prisma.issue.findUnique({
    where: { magazineId_issueNumber: { magazineId, issueNumber: value } },
    select,
  });
  if (byNumber) return byNumber;

  // Scoped to the magazine like the other two: a cuid from a different
  // magazine must 404 rather than render under the wrong masthead.
  return prisma.issue.findFirst({ where: { id: value, magazineId }, select });
}

/**
 * 中文 slug 在網址上是 percent-encoded，而 Next 交給我們的 param 還是編碼後的
 * 樣子。壞掉的 escape sequence 會讓 decodeURIComponent 丟例外——那是使用者亂
 * 打的網址，該走 404，不是 500。
 */
export function decodeParam(param: string): string {
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
  }
}
