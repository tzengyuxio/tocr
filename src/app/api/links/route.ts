import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { externalLinkCreateSchema } from "@/lib/validators/external-link";
import { withErrorHandler } from "@/lib/api-utils";
import { logEdit } from "@/lib/edit-log";

// POST /api/links - 新增一條站外連結
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = externalLinkCreateSchema.parse(await request.json());

  // 排在同一個掛點現有的連結之後，同 /api/photos。
  const last = await prisma.externalLink.findFirst({
    where: data.magazineId
      ? { magazineId: data.magazineId }
      : { issueId: data.issueId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const link = await prisma.externalLink.create({
    data: { ...data, order: last ? last.order + 1 : 0 },
  });

  await logEdit("ExternalLink", link.id, "CREATE", {
    site: link.site,
    url: link.url,
    magazineId: link.magazineId,
    issueId: link.issueId,
  });

  return NextResponse.json(link, { status: 201 });
}, "Create external link");
