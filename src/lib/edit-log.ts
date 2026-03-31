import { prisma } from "./prisma";
import { auth } from "./auth";
import { isDevBypass, DEV_USER } from "./dev-auth";

export type EditAction = "CREATE" | "UPDATE" | "DELETE";
export type EntityType = "Magazine" | "Issue" | "Article" | "Tag" | "Game" | "User";

/**
 * Get the current authenticated user's ID.
 * Returns null if not authenticated (should not happen for write operations
 * since middleware enforces auth).
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (isDevBypass) {
    return DEV_USER.id;
  }
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Log an edit action to the EditLog table.
 * Silently skips if no user ID is available (e.g. during migration scripts).
 */
export async function logEdit(
  entityType: string,
  entityId: string,
  action: EditAction,
  changes?: Record<string, unknown>
) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  prisma.editLog.create({
    data: {
      userId,
      entityType,
      entityId,
      action,
      changes: changes as never,
    },
  }).catch(console.error);
}
