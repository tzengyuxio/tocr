import { headers } from "next/headers";
import { prisma } from "./prisma";
import { auth } from "./auth";
import { isDevBypass, DEV_USER } from "./dev-auth";
import { API_USER, isValidApiToken } from "./api-token";

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
  if (session?.user?.id) {
    return session.user.id;
  }
  return (await isApiTokenRequest()) ? API_USER.id : null;
}

async function isApiTokenRequest(): Promise<boolean> {
  try {
    return isValidApiToken((await headers()).get("authorization"));
  } catch {
    // No request scope (scripts, tests) -- there is no token to read.
    return false;
  }
}

/**
 * DEV_USER and API_USER never sign in, so they have no row in `users` and every
 * edit log hits the userId foreign key. Create the row on first use.
 */
type SyntheticUser = typeof DEV_USER | typeof API_USER;

const syntheticUsersReady = new Map<string, Promise<void>>();

function ensureUser(user: SyntheticUser): Promise<void> {
  let ready = syntheticUsersReady.get(user.id);
  if (!ready) {
    ready = prisma.user
      .upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        update: {},
      })
      .then(() => undefined)
      .catch((error) => {
        // Retry on the next write rather than caching the failure.
        syntheticUsersReady.delete(user.id);
        throw error;
      });
    syntheticUsersReady.set(user.id, ready);
  }
  return ready;
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

  const synthetic =
    userId === DEV_USER.id
      ? DEV_USER
      : userId === API_USER.id
        ? API_USER
        : null;
  const ready = synthetic ? ensureUser(synthetic) : Promise.resolve();

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
