import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-utils";
import { sessionEditorId } from "@/lib/require-editor";

/**
 * DELETE /api/tokens/[id] - 撤銷一支 token
 *
 * Marks rather than deletes: a token that vanishes takes with it the answer to
 * "what was that thing hitting the API last month". Revoking twice is a no-op,
 * so a double click is not an error.
 */
export const DELETE = withErrorHandler(async (_request, context) => {
  const userId = await sessionEditorId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = (await context!.params) as { id: string };

  // Scoped by userId as well as id, so a guessed id belonging to somebody else
  // reads as "not found" rather than revoking their token.
  const { count } = await prisma.apiToken.updateMany({
    where: { id, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (count === 0) {
    const exists = await prisma.apiToken.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ revoked: true });
}, "Revoke API token");
