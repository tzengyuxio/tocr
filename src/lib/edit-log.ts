import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import { auth } from "./auth";
import { isDevBypass, DEV_USER } from "./dev-auth";
import { API_USER, isValidApiToken } from "./api-token";

export type EditAction = "CREATE" | "UPDATE" | "DELETE";

export type EntityType = "Magazine" | "Issue" | "Article" | "Tag" | "Game" | "User";

/**
 * Activity feeds show one line per action, not one per record: a 50-article
 * review would otherwise push everything else off the page. Only the leading
 * row of a batch carries batchSize, so this keeps that row and hides its
 * siblings -- which stay in the table, holding each record's own history.
 */
export const FEED_SCOPE: Prisma.EditLogWhereInput = {
  OR: [{ batchId: null }, { batchSize: { not: null } }],
};

/**
 * Edits that count as work on the catalogue.
 *
 * Account housekeeping -- someone renaming themselves, an admin granting a
 * role -- is a real edit and stays in the audit log at /admin/edit-logs. It is
 * not cataloguing, though, so it earns neither a place on the contributor
 * leaderboard nor a line in the activity feed: renaming A to B and back would
 * otherwise be worth two contributions.
 */
export const CATALOGUE_ONLY: Prisma.EditLogWhereInput = {
  entityType: { not: "User" },
};

/** The activity feed: one line per action, and only catalogue work. */
export const CONTRIBUTION_FEED_SCOPE: Prisma.EditLogWhereInput = {
  ...FEED_SCOPE,
  ...CATALOGUE_ONLY,
};

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
 * edit log hits the userId foreign key. Create the row on first use, and keep
 * its name in sync so renaming them in code reaches existing deployments too.
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
        update: {
          email: user.email,
          name: user.name,
        },
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
 * Resolve who is writing, making sure the row exists for the synthetic users.
 * Returns null when there is nobody to attribute the edit to.
 */
async function resolveAuthor(): Promise<string | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const synthetic =
    userId === DEV_USER.id
      ? DEV_USER
      : userId === API_USER.id
        ? API_USER
        : null;
  if (synthetic) await ensureUser(synthetic);

  return userId;
}

/**
 * Write the log, but never fail the edit over it: the record the caller asked
 * for is already saved, and refusing to acknowledge that would be worse than
 * a gap in the history. The write is awaited rather than left running, so on
 * a serverless platform it finishes before the response ends -- and so does
 * its error reporting, which used to be lost with it.
 */
async function writeLog(write: () => Promise<unknown>) {
  try {
    await write();
  } catch (error) {
    console.error("Edit log write failed:", error);
  }
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
  // An UPDATE whose diff is empty wrote nothing. Logging it puts a line in the
  // feed and a point on the contributor board for a save that changed no
  // field. CREATE and DELETE carry meaning without a diff, so they still log.
  if (action === "UPDATE" && changes && Object.keys(changes).length === 0) {
    return;
  }

  const userId = await resolveAuthor();
  if (!userId) return;

  await writeLog(() =>
    prisma.editLog.create({
      data: {
        userId,
        entityType,
        entityId,
        action,
        changes: changes as never,
      },
    })
  );
}

/**
 * Log one row per record for a batch that a person saved in one go.
 *
 * A single summary row would leave every record but the first with no history
 * at all, and that cannot be reconstructed later. The rows share a batchId so
 * the activity feed can still show the batch as one line: only the first
 * carries batchSize, which is what the feed filters on.
 */
export async function logEditBatch(
  entityType: string,
  entityIds: string[],
  action: EditAction,
  changes?: Record<string, unknown>
) {
  if (entityIds.length === 0) return;

  const userId = await resolveAuthor();
  if (!userId) return;

  const batchId = randomUUID();

  await writeLog(() =>
    prisma.editLog.createMany({
      data: entityIds.map((entityId, index) => ({
        userId,
        entityType,
        entityId,
        action,
        changes: changes as never,
        batchId,
        batchSize: index === 0 ? entityIds.length : null,
      })),
    })
  );
}
