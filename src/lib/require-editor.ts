import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDevBypass, DEV_USER } from "@/lib/dev-auth";
import { isValidApiToken } from "@/lib/api-token";
import { resolveApiToken } from "@/lib/user-api-token";

/**
 * Second authorisation check, for the routes that spend money or write files.
 *
 * middleware.ts already gates every write and is the right place for the rule.
 * The problem is that it is the *only* place: Next.js has shipped a middleware
 * bypass before (CVE-2025-29927), and behind it these routes call a paid model
 * or push bytes into blob storage with no check of their own.
 *
 * Mirrors the middleware rule deliberately -- API token or an EDITOR/ADMIN
 * session. Returns the response to send when the caller is not allowed, and
 * null when it is.
 */
export async function requireEditor(
  request: NextRequest
): Promise<NextResponse | null> {
  if (isDevBypass) return null;

  // Scripted imports carry a token instead of a session; middleware accepts it
  // for writes, so refusing it here would break them. A per-user token has
  // already had its owner's role checked by the time it resolves.
  const authorization = request.headers.get("authorization");
  if (isValidApiToken(authorization)) return null;
  if (await resolveApiToken(authorization)) return null;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  if (!role || !["EDITOR", "ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

/**
 * The signed-in editor, or null. No token is accepted here however valid:
 * this is for the endpoints that manage the tokens themselves, and a token
 * that can mint another token is a token that cannot be revoked.
 */
export async function sessionEditorId(): Promise<string | null> {
  if (isDevBypass) return DEV_USER.id;

  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !role || !["EDITOR", "ADMIN"].includes(role)) {
    return null;
  }
  return session.user.id;
}
