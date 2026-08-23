import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { magazineUpdateSchema, withFoundedSort } from "@/lib/validators/magazine";
import { withErrorHandler } from "@/lib/api-utils";
import { logEdit } from "@/lib/edit-log";
import { diffChanges } from "@/lib/edit-log-diff";
import { withoutCompleteMark } from "@/lib/issue-complete";
import { isSessionAdmin } from "@/lib/require-editor";
import {
  RETIRED_SLUG_MESSAGE,
  isRetiredByAnother,
  recordSlugChange,
} from "@/lib/magazine-slug";

// GET /api/magazines/[id] - 取得單一期刊
export const GET = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;

  const magazine = await prisma.magazine.findUnique({
    where: { id },
    include: {
      issues: {
        orderBy: { order: "desc" },
        take: 10,
      },
      _count: {
        select: { issues: true },
      },
    },
  });

  if (!magazine) {
    return NextResponse.json(
      { error: "Magazine not found" },
      { status: 404 }
    );
  }

  // 這裡也帶著單期，所以完備標記一樣要擋。
  if (await isSessionAdmin()) {
    return NextResponse.json(magazine);
  }
  return NextResponse.json({
    ...magazine,
    issues: magazine.issues.map(withoutCompleteMark),
  });
}, "Fetch magazine");

// PUT /api/magazines/[id] - 更新期刊
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;
  const body = await request.json();
  const validatedData = magazineUpdateSchema.parse(body);

  const before = await prisma.magazine.findUnique({ where: { id } });

  // 換代號要留下轉址。舊代號散在外面的連結（含這本刊每一期的網址）全靠它。
  const oldSlug = before?.slug;
  const newSlug = validatedData.slug;
  const slugChanged = newSlug !== undefined && oldSlug !== undefined && newSlug !== oldSlug;

  if (slugChanged && (await isRetiredByAnother(prisma, newSlug, id))) {
    return NextResponse.json({ error: RETIRED_SLUG_MESSAGE }, { status: 409 });
  }

  const magazine = await prisma.$transaction(async (tx) => {
    const updated = await tx.magazine.update({
      where: { id },
      data: withFoundedSort(validatedData),
    });
    if (slugChanged) await recordSlugChange(tx, id, oldSlug, newSlug);
    return updated;
  });

  await logEdit("Magazine", id, "UPDATE", diffChanges(before, magazine));

  return NextResponse.json(magazine);
}, "Update magazine");

// DELETE /api/magazines/[id] - 刪除期刊
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;

  // delete() 回傳被刪的那筆，正好用來記下它叫什麼 -- 紀錄活得比資料久，
  // 只留 id 的話事後看不出刪掉的是什麼。
  const deleted = await prisma.magazine.delete({
    where: { id },
  });

  await logEdit("Magazine", id, "DELETE", { name: { from: deleted.name, to: null } });

  return NextResponse.json({ success: true });
}, "Delete magazine");
