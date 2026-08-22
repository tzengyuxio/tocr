import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-utils";
import {
  headerLine,
  rowsFor,
  type ExportIssue,
} from "@/lib/csv/export-rows";
import { finishExportLog, startExportLog } from "@/lib/export-log";

// Issues are read a batch at a time so peak memory stays flat regardless of
// how much has been catalogued. 549 issues is roughly 11 queries.
const ISSUE_BATCH_SIZE = 50;

const ARTICLE_INCLUDE = {
  articles: {
    orderBy: { sortOrder: "asc" },
    include: {
      articleTags: { include: { tag: true } },
      articleGames: { include: { game: true } },
    },
  },
} as const;

export const GET = withErrorHandler(async (request: NextRequest) => {
  const magazineId = request.nextUrl.searchParams.get("magazineId");

  const magazines = await prisma.magazine.findMany({
    where: magazineId ? { id: magazineId } : {},
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      nameOriginal: true,
      publisher: true,
      issn: true,
      description: true,
      foundedDate: true,
      isActive: true,
    },
  });

  // Opened before the first byte goes out, so a download that dies halfway
  // still leaves a trace. See lib/export-log.ts.
  const logId = await startExportLog(request, {
    magazineId,
    magazineName: magazineId ? (magazines[0]?.name ?? null) : null,
  });

  const encoder = new TextEncoder();
  let rowCount = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // BOM so Excel opens the file as UTF-8.
        controller.enqueue(encoder.encode("\uFEFF" + headerLine()));

        for (const magazine of magazines) {
          let cursor: string | undefined;
          let seenAny = false;

          for (;;) {
            const issues = await prisma.issue.findMany({
              where: { magazineId: magazine.id },
              // One magazine's run, so `order` is the ruler -- not every issue
              // has a date. The id tiebreak is what makes batching safe:
              // `order` alone leaves ties in an arbitrary order, and an
              // unstable order across queries drops or repeats rows at batch
              // edges.
              orderBy: [{ order: "asc" }, { id: "asc" }],
              take: ISSUE_BATCH_SIZE,
              ...(cursor && { cursor: { id: cursor }, skip: 1 }),
              include: ARTICLE_INCLUDE,
            });

            if (issues.length === 0) break;

            seenAny = true;
            const lines = rowsFor(magazine, issues as ExportIssue[]);
            rowCount += lines.length;
            controller.enqueue(encoder.encode("\r\n" + lines.join("\r\n")));

            if (issues.length < ISSUE_BATCH_SIZE) break;
            cursor = issues[issues.length - 1].id;
          }

          // A magazine with no issues still gets its own row.
          if (!seenAny) {
            const lines = rowsFor(magazine, []);
            rowCount += lines.length;
            controller.enqueue(encoder.encode("\r\n" + lines.join("\r\n")));
          }
        }

        await finishExportLog(logId, rowCount);
        controller.close();
      } catch (error) {
        // Headers are already sent, so this cannot become a 500 -- the client
        // sees a truncated file. Logged so the cause is not lost.
        console.error("Export CSV failed mid-stream:", error);
        controller.error(error);
      }
    },
  });

  const today = new Date().toISOString().split("T")[0];

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tocr-export-${today}.csv"`,
    },
  });
}, "Export CSV");
