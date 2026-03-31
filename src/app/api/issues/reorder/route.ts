import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reorderSchema } from "@/lib/validators/reorder";
import { withErrorHandler } from "@/lib/api-utils";

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { magazineId, issueIds } = reorderSchema.parse(body);

  await prisma.$transaction(
    issueIds.map((id, index) =>
      prisma.issue.update({
        where: { id },
        data: { order: index },
      })
    )
  );

  return NextResponse.json({ success: true });
}, "Reorder issues");
