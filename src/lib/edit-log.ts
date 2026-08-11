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
 * Under DEV_BYPASS_AUTH there is no sign-in, so DEV_USER has no row in `users`
 * and every edit log hits the userId foreign key. Create the row on first use.
 */
let devUserReady: Promise<void> | null = null;

function ensureDevUser(): Promise<void> {
  devUserReady ??= prisma.user
    .upsert({
      where: { id: DEV_USER.id },
      create: {
        id: DEV_USER.id,
        email: DEV_USER.email,
        name: DEV_USER.name,
        role: DEV_USER.role,
      },
      update: {},
    })
    .then(() => undefined)
    .catch((error) => {
      // Retry on the next write rather than caching the failure.
      devUserReady = null;
      throw error;
    });
  return devUserReady;
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

  const ready = isDevBypass ? ensureDevUser() : Promise.resolve();

  ready
    .then(() =>
      prisma.editLog.create({
        data: {
          userId,
          entityType,
          entityId,
          action,
          changes: changes as never,
        },
      })
    )
    .catch(console.error);
}
