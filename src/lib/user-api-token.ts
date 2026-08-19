import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma";

/**
 * Per-user API tokens: a contributor's own credential for scripted writes.
 *
 * Holding one is the same as being that person -- the edit log carries their
 * name, and the permission check reads their role at the time of the request,
 * so demoting or deleting the account retires every token they hold without
 * anyone having to remember to revoke it.
 *
 * Separate from api-token.ts on purpose: that one is a plain environment
 * variable and is imported by client-bundled validators, so it must stay free
 * of prisma.
 */

/** Marks the string as ours, so a token can be recognised in a log or a paste. */
const TOKEN_PREFIX = "tocr_";

/** How much of the plaintext is kept in the clear to identify the token by. */
export const TOKEN_HINT_LENGTH = 12;

/** Roles a token may act as. Below this it buys nothing the session would not. */
const WRITE_ROLES = ["EDITOR", "ADMIN"];

/** Updating on every request would add a write per call of a bulk import. */
const LAST_USED_THROTTLE_MS = 5 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** The plaintext exists only in the response that creates it; we keep the hash. */
export function generateApiToken(): {
  token: string;
  tokenHash: string;
  prefix: string;
} {
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashToken(token),
    prefix: token.slice(0, TOKEN_HINT_LENGTH),
  };
}

export function readBearerToken(
  authorization: string | null | undefined
): string | null {
  const prefix = "Bearer ";
  if (!authorization?.startsWith(prefix)) return null;
  return authorization.slice(prefix.length).trim() || null;
}

export interface ApiTokenBearer {
  userId: string;
  tokenId: string;
}

/**
 * Who this Authorization header speaks for, or null if nobody.
 *
 * Looked up by the hash rather than compared value by value: the secret is
 * never in the row, so a unique-index hit is the whole check and there is no
 * comparison whose timing could leak anything.
 */
export async function resolveApiToken(
  authorization: string | null | undefined
): Promise<ApiTokenBearer | null> {
  const token = readBearerToken(authorization);
  // The env-var token in api-token.ts shares this header, and every other
  // string is somebody's typo -- neither is worth a database round trip.
  if (!token?.startsWith(TOKEN_PREFIX)) return null;

  const record = await prisma.apiToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      userId: true,
      revokedAt: true,
      lastUsedAt: true,
      user: { select: { role: true } },
    },
  });

  if (!record || record.revokedAt) return null;
  if (!WRITE_ROLES.includes(record.user.role)) return null;

  await touch(record.id, record.lastUsedAt);

  return { userId: record.userId, tokenId: record.id };
}

/**
 * Awaited rather than left running: on a serverless platform the function can
 * be frozen the moment the response ends, and a rejected promise nobody is
 * holding takes the process down with it.
 */
async function touch(id: string, lastUsedAt: Date | null): Promise<void> {
  if (lastUsedAt && Date.now() - lastUsedAt.getTime() < LAST_USED_THROTTLE_MS) {
    return;
  }
  try {
    await prisma.apiToken.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  } catch (error) {
    // A request that did real work must not fail over its own bookkeeping.
    console.error("API token lastUsedAt update failed:", error);
  }
}
