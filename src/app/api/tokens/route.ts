import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-utils";
import { sessionEditorId } from "@/lib/require-editor";
import { ensureUserRow } from "@/lib/edit-log";
import { generateApiToken } from "@/lib/user-api-token";
import { apiTokenNameSchema } from "@/lib/validators/api-token";

/** Everything about a token except the one thing we no longer have: the secret. */
const LIST_FIELDS = {
  id: true,
  name: true,
  prefix: true,
  createdAt: true,
  lastUsedAt: true,
  revokedAt: true,
} as const;

/**
 * GET /api/tokens - 自己的 token 清單
 *
 * Scoped to the caller, like /api/users/me: there is no id in the URL to point
 * at somebody else's, and an admin has no reason to read another person's --
 * the plaintext is gone either way, and revoking is the account owner's job.
 */
export const GET = withErrorHandler(async () => {
  const userId = await sessionEditorId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokens = await prisma.apiToken.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: LIST_FIELDS,
  });

  return NextResponse.json({ data: tokens });
}, "List API tokens");

/**
 * POST /api/tokens - 產生一支新 token
 *
 * The plaintext is in this response and nowhere else: the row holds a sha256
 * of it. Losing it means creating another one, which is the point -- a token
 * that can be read back later is a token that leaks with the database.
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const userId = await sessionEditorId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  // safeParse so the schema's own wording reaches the person typing the name,
  // rather than withErrorHandler's generic "Validation failed".
  const parsed = apiTokenNameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "名稱無效" },
      { status: 400 }
    );
  }

  // dev-user has no row until something creates one, and the foreign key here
  // is checked before any edit log would have done it.
  await ensureUserRow(userId);

  const { token, tokenHash, prefix } = generateApiToken();
  const created = await prisma.apiToken.create({
    data: { userId, name: parsed.data.name, tokenHash, prefix },
    select: LIST_FIELDS,
  });

  return NextResponse.json({ ...created, token }, { status: 201 });
}, "Create API token");
