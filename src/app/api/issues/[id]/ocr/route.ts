import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-utils";

/**
 * GET /api/issues/[id]/ocr - 取得該單期最近一次成功的辨識結果
 *
 * Recognising a table of contents is slow and costs a model call, so the review
 * step reads the stored result back instead of running it again.
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;

  const record = await prisma.ocrRecord.findFirst({
    where: { issueId: id },
    orderBy: { processedAt: "desc" },
    select: { id: true, rawResult: true, provider: true, processedAt: true },
  });

  if (!record) {
    return NextResponse.json({ error: "No OCR record found" }, { status: 404 });
  }

  return NextResponse.json({
    id: record.id,
    result: record.rawResult,
    provider: record.provider,
    processedAt: record.processedAt,
  });
}, "Fetch OCR record");
