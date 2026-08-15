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
  const { name } = displayNameSchema.parse(body);

  // Case-insensitive so two contributors cannot end up as "Alice" and "alice",
  // which the leaderboard would show as two indistinguishable rows.
  const taken = await prisma.user.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      NOT: { id: userId },
    },
    select: { id: true },
  });

  if (taken) {
    return NextResponse.json(
      { error: "這個顯示名稱已經有人使用了" },
      { status: 409 }
    );
  }

  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  const user = await prisma.user.update({
    where: { id: userId },
    data: { name },
    select: { id: true, name: true, email: true, image: true, role: true },
  });

  await logEdit("User", userId, "UPDATE", diffChanges(before, { name: user.name }));

  return NextResponse.json(user);
}, "Update display name");
