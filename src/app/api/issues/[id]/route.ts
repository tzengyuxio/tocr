import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  issueUpdateSchema,
  withCompleteAt,
  withIssueSlugIfPresent,
  withPublishSortIfPresent,
  withTocReviewedAt,
} from "@/lib/validators/issue";
import { withErrorHandler } from "@/lib/api-utils";
import { logEdit } from "@/lib/edit-log";
import { diffChanges } from "@/lib/edit-log-diff";
import { isValidApiToken } from "@/lib/api-token";
import { isSessionAdmin } from "@/lib/require-editor";
import {
  markIssueChanged,
  touchesData,
  withoutCompleteMark,
} from "@/lib/issue-complete";

// GET /api/issues/[id] - 取得單一單期
export const GET = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;

  const issue = await prisma.issue.findUnique({
    where: { id },
    include: {
      magazine: {
        select: { id: true, name: true },
      },
      articles: {
        orderBy: { sortOrder: "asc" },
        include: {
          articleTags: {
            include: { tag: true },
          },
          articleGames: {
            include: { game: true },
          },
        },
      },
    },
  });

  if (!issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  return NextResponse.json(
    (await isSessionAdmin()) ? issue : withoutCompleteMark(issue)
  );
}, "Fetch issue");

// PUT /api/issues/[id] - 更新單期
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;
  const body = await request.json();
  const validatedData = issueUpdateSchema.parse(body);

  const isHuman = !isValidApiToken(request.headers.get("authorization"));
  const isAdmin = await isSessionAdmin();
  const existing = await prisma.issue.findUnique({ where: { id } });

  const data = withCompleteAt(
    withTocReviewedAt(
      withIssueSlugIfPresent(withPublishSortIfPresent(validatedData)),
      {
        isHuman,
        current: existing?.tocReviewedAt ?? null,
      }
    ),
    { isAdmin, current: existing?.completeAt ?? null }
  );

  const issue = await prisma.issue.update({ where: { id }, data });

  // Diffing the stored rows logs what was written, not what was asked for: a
  // token write's tocReviewed flag is dropped, and the history should not
  // claim otherwise.
  const changes = diffChanges(existing, issue);
  await logEdit("Issue", id, "UPDATE", changes);

  // The same diff decides whether a 完備 mark still stands. Reading the stored
  // rows rather than the payload keeps the two in step: a field sent back
  // unchanged is not a change, and the marking write itself is not one either.
  // Skipped when this request set the mark -- an admin who ticks the box while
  // saving other edits has just looked at what they saved.
  if (data.completeAt === undefined && touchesData(changes)) {
    await markIssueChanged(id);
  }

  return NextResponse.json(isAdmin ? issue : withoutCompleteMark(issue));
}, "Update issue");

// DELETE /api/issues/[id] - 刪除單期
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;

  // 期號單獨看認不出是哪一本，所以連雜誌名一起記。delete() 不能 include，
  // 而刪掉之後就查不到了，只好先讀一次。
  const before = await prisma.issue.findUnique({
    where: { id },
    select: { issueNumber: true, magazine: { select: { name: true } } },
  });

  await prisma.issue.delete({
    where: { id },
  });

  await logEdit("Issue", id, "DELETE", {
    name: {
      from: before ? `${before.magazine.name} ${before.issueNumber}` : null,
      to: null,
    },
  });

  return NextResponse.json({ success: true });
}, "Delete issue");
