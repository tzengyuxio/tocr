import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDevBypass } from "@/lib/dev-auth";
import { withErrorHandler } from "@/lib/api-utils";

// GET /api/users - 取得使用者列表（僅限 Admin）
export const GET = withErrorHandler(async () => {
  if (!isDevBypass) {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 檢查是否為 Admin
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (currentUser?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      createdAt: true,
      _count: {
        select: { editLogs: true },
      },
    },
  });

  return NextResponse.json({ data: users });
}, "Fetch users");
