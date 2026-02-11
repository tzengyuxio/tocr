import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isDevBypass } from "@/lib/dev-auth";

export default auth((req) => {
  if (isDevBypass) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  // 後台路由權限檢查
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    // 只有 EDITOR 和 ADMIN 可以存取後台
    if (!userRole || !["EDITOR", "ADMIN"].includes(userRole)) {
      return NextResponse.redirect(new URL("/auth/unauthorized", req.url));
    }

    // 使用者管理只有 ADMIN 可存取
    if (pathname.startsWith("/admin/users") && userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  // API 路由權限檢查（寫入操作）
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
    const method = req.method;
    const isWriteOperation = ["POST", "PUT", "PATCH", "DELETE"].includes(
      method
    );

    if (isWriteOperation) {
      if (!isLoggedIn) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (!userRole || !["EDITOR", "ADMIN"].includes(userRole)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  return NextResponse.next();
});

export const runtime = "nodejs";

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
