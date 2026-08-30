import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-utils";
import { logEdit, getCurrentUserId } from "@/lib/edit-log";
import { diffChanges } from "@/lib/edit-log-diff";
import { displayNameSchema, isSyntheticUser } from "@/lib/validators/user";

/**
 * PATCH /api/users/me - 修改自己的顯示名稱
 *
 * Scoped to the caller rather than taking an id: the name is the only thing a
 * person may change about their own account, and there is no id in the URL to
 * point at somebody else's. Changing roles stays in /api/users/[id], which is
 * admin-only.
 *
 * The name is public -- it appears on the contributor leaderboard and against
 * every edit -- and the edit log reads it live, so renaming also renames the
 * person's past entries. That is intended: one person, one name.
 */
export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // dev-user and api-token have their names written by ensureUser on every
  // edit, so a change here would be silently reverted by the next one.
  if (isSyntheticUser(userId)) {
    return NextResponse.json(
      { error: "系統帳號的名稱由程式管理，不能修改" },
      { status: 403 }
    );
  }

  const body = await request.json();
  // safeParse, not parse: withErrorHandler turns a ZodError into a generic
  // "Validation failed", so the reasons the schema spells out -- blank, too
  // long, reserved -- would never reach the person typing the name.
  const parsed = displayNameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "顯示名稱無效" },
      { status: 400 }
    );
  }
  const { name } = parsed.data;

  // Case-insensitive so two contributors cannot end up as "Alice" and "alice",
  // which the leaderboard would show as two indistinguishable rows.
  //
  // Raw lower() rather than Prisma's mode: "insensitive", which compiles to
  // ILIKE and hands the name over as a pattern -- a person calling themselves
  // "100%_愛" would be told the name was taken by anything ILIKE matched.
  const taken = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM users
    WHERE lower(name) = lower(${name}) AND id <> ${userId}
    LIMIT 1
  `;

  if (taken.length > 0) {
    return NextResponse.json(
      { error: "這個顯示名稱已經有人使用了" },
      { status: 409 }
    );
  }

  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  let user;
  try {
    user = await prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { id: true, name: true, email: true, image: true, role: true },
    });
  } catch (error) {
    // The lookup above is read-then-write: two people submitting the same name
    // at the same moment both see it free and both write it. What actually
    // holds the line is users_name_lower_key (migration
    // 20260830000000_users_name_unique_ci); the query only exists to word the
    // error, since a bare P2002 says nothing about which name to change.
    //
    // Any P2002 raised here is that index -- this update writes `name` and
    // nothing else, so the unique on `email` cannot be the one that fired.
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "這個顯示名稱已經有人使用了" },
        { status: 409 }
      );
    }
    throw error;
  }

  await logEdit("User", userId, "UPDATE", diffChanges(before, { name: user.name }));

  return NextResponse.json(user);
}, "Update display name");
