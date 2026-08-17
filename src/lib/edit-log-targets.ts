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
  /**
   * The log's `changes`. A DELETE outlives the record it describes, so the
   * name it carried is the only thing left to name it by.
   */
  changes?: unknown;
}

/** `{ from, to }` as diffChanges writes it. */
function fieldFrom(changes: unknown, field: string): string | null {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return null;
  const value = (changes as Record<string, unknown>)[field];
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const from = (value as Record<string, unknown>).from;
  return typeof from === "string" && from ? from : null;
}

/** The record this one was merged into, when the log says so. */
function mergedInto(changes: unknown): string | null {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return null;
  const id = (changes as Record<string, unknown>).mergedInto;
  return typeof id === "string" && id ? id : null;
}

/** The name a deleted record went by, from whichever field carried it. */
function deletedName(changes: unknown): string | null {
  return fieldFrom(changes, "name") ?? fieldFrom(changes, "title");
}

export type EditLogTargetLookup = (ref: EditLogRef) => EditLogTarget;

/**
 * Name a record that is gone.
 *
 * The name comes from the log's own `changes`, because the row it described
 * no longer exists. Older logs recorded nothing but the id, so those still
 * fall back to it -- an id at least matches against a backup or another log.
 */
function deletedTarget(
  entityId: string,
  changes: unknown,
  survivor: EditLogTarget | null
): EditLogTarget {
  const name = deletedName(changes);

  if (name && survivor) {
    return { label: `${name}（已合併至 ${survivor.label}）`, href: survivor.href };
  }
  if (name) return { label: `${name}（已刪除）`, href: null };
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
  const add = (entityType: string, id: string) => {
    const ids = idsByType.get(entityType) ?? new Set<string>();
    ids.add(id);
    idsByType.set(entityType, ids);
  };

  for (const ref of refs) {
    if (!ref.entityId) continue;
    add(ref.entityType, ref.entityId);
    // The survivor of a merge is a live record, so it resolves through the
    // same batch and gets a working link.
    const survivorId = mergedInto(ref.changes);
    if (survivorId) add(ref.entityType, survivorId);
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
  return (ref) => {
    const found = targets.get(`${ref.entityType}:${ref.entityId}`);
    if (found) return found;

    const survivorId = mergedInto(ref.changes);
    const survivor = survivorId
      ? targets.get(`${ref.entityType}:${survivorId}`) ?? null
      : null;
    return deletedTarget(ref.entityId, ref.changes, survivor);
  };
}
