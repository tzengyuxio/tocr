import { prisma } from "./prisma";
import { getCurrentUserId } from "./edit-log";

interface ExportScope {
  magazineId: string | null;
  magazineName: string | null;
}

/** x-forwarded-for grows as it passes proxies; the client is the first entry. */
function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || null;
}

/**
 * Open the record before the stream starts.
 *
 * Writing it up front means a download that dies halfway still leaves a trace;
 * `rowCount` staying null is what marks it as unfinished. Logging never blocks
 * the export -- an unattributable or unrecordable export is still an export,
 * and refusing to serve it would be the worse failure.
 */
export async function startExportLog(
  request: Request,
  scope: ExportScope
): Promise<string | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const log = await prisma.exportLog.create({
      data: {
        userId,
        magazineId: scope.magazineId,
        magazineName: scope.magazineName,
        ipAddress: clientIp(request),
        userAgent: request.headers.get("user-agent"),
      },
    });
    return log.id;
  } catch (error) {
    console.error("Failed to open export log:", error);
    return null;
  }
}

/** Close the record once every row is out. */
export async function finishExportLog(
  logId: string | null,
  rowCount: number
): Promise<void> {
  if (!logId) return;

  try {
    await prisma.exportLog.update({
      where: { id: logId },
      data: { rowCount },
    });
  } catch (error) {
    console.error("Failed to close export log:", error);
  }
}
