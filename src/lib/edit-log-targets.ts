import { prisma } from "./prisma";

export interface EditLogTarget {
  /** Human-readable name of the edited record. */
  label: string;
  /** Admin page for the record, or null when there is nothing to open. */
  href: string | null;
}

export interface EditLogRef {
  entityType: string;
  entityId: string;
}

export type EditLogTargetLookup = (ref: EditLogRef) => EditLogTarget;

/**
 * DELETE logs outlive the record they describe, so the id is all that is left
 * to match against a backup or another log.
 */
function deletedTarget(entityId: string): EditLogTarget {
  return {
    label: entityId ? `（已刪除 · ${entityId}）` : "（已刪除）",
    href: null,
  };
}

/** Names are only loaded for the entity types that appear in the logs. */
async function loadTargets(
  entityType: string,
  ids: string[],
  revealUsers: boolean
): Promise<[string, EditLogTarget][]> {
  switch (entityType) {
    case "Magazine": {
      const rows = await prisma.magazine.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      });
      return rows.map((row) => [
        row.id,
        { label: row.name, href: `/admin/magazines/${row.id}` },
      ]);
    }
    case "Issue": {
      const rows = await prisma.issue.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          issueNumber: true,
          magazine: { select: { id: true, name: true } },
        },
      });
      return rows.map((row) => [
        row.id,
        {
          label: `${row.magazine.name} ${row.issueNumber}`,
          href: `/admin/magazines/${row.magazine.id}/issues/${row.id}`,
        },
      ]);
    }
    case "Article": {
      const rows = await prisma.article.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true },
      });
      return rows.map((row) => [
        row.id,
        { label: row.title, href: `/admin/articles/${row.id}` },
      ]);
    }
    case "Tag": {
      const rows = await prisma.tag.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      });
      return rows.map((row) => [
        row.id,
        { label: row.name, href: `/admin/tags/${row.id}` },
      ]);
    }
    case "Game": {
      const rows = await prisma.game.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      });
      return rows.map((row) => [
        row.id,
        { label: row.name, href: `/admin/games/${row.id}` },
      ]);
    }
    case "User": {
      // Only ADMIN may see who the account belongs to -- /admin/users is
      // ADMIN-only for the same reason. User management is a single list page,
      // so there is nothing per-id to open either way.
      if (!revealUsers) {
        return ids.map((id) => [id, { label: "（僅管理員可見）", href: null }]);
      }
      const rows = await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, email: true },
      });
      return rows.map((row) => [row.id, { label: row.name || row.email, href: null }]);
    }
    default:
      return [];
  }
}

/**
 * Name the records a batch of edit logs points at, one query per entity type.
 * Returns a lookup that falls back to a deleted marker for records that are
 * gone -- or that never existed, since a few call sites log an id belonging to
 * a related record.
 *
 * Pass revealUsers only on ADMIN-only pages.
 */
export async function resolveEditLogTargets(
  refs: EditLogRef[],
  { revealUsers = false }: { revealUsers?: boolean } = {}
): Promise<EditLogTargetLookup> {
  const idsByType = new Map<string, Set<string>>();
  for (const ref of refs) {
    if (!ref.entityId) continue;
    const ids = idsByType.get(ref.entityType) ?? new Set<string>();
    ids.add(ref.entityId);
    idsByType.set(ref.entityType, ids);
  }

  const loaded = await Promise.all(
    [...idsByType].map(async ([entityType, ids]) => {
      const entries = await loadTargets(entityType, [...ids], revealUsers);
      return entries.map(
        ([id, target]) => [`${entityType}:${id}`, target] as const
      );
    })
  );

  const targets = new Map<string, EditLogTarget>(loaded.flat());
  return (ref) =>
    targets.get(`${ref.entityType}:${ref.entityId}`) ??
    deletedTarget(ref.entityId);
}
