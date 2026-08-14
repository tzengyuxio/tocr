import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Issues waiting for someone to confirm their contents.
 *
 * An issue with neither scans nor articles has nothing to review yet. Articles
 * count on their own: OCR can be run on images that were never attached to the
 * issue.
 *
 * Shared so the review page's filter and the sidebar's badge cannot drift into
 * counting different things.
 */
export const PENDING_REVIEW_WHERE: Prisma.IssueWhereInput = {
  tocReviewedAt: null,
  OR: [{ NOT: { tocImages: { isEmpty: true } } }, { articles: { some: {} } }],
};

export function countPendingReview(): Promise<number> {
  return prisma.issue.count({ where: PENDING_REVIEW_WHERE });
}
