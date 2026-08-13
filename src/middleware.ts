import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isDevBypass } from "@/lib/dev-auth";
import { isValidApiToken } from "@/lib/api-token";

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

    // 使用者管理與編輯紀錄只有 ADMIN 可存取
    if (
      (pathname.startsWith("/admin/users") ||
        pathname.startsWith("/admin/edit-logs")) &&
      userRole !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  // API 路由權限檢查（寫入操作，以及少數需要保護的讀取）
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
    const method = req.method;
    const isWriteOperation = ["POST", "PUT", "PATCH", "DELETE"].includes(
      method
    );

    // The CSV export dumps the whole catalogue in one request. The data is
    // public, but serving it to anyone is a cost the site should not carry.
    const isProtectedRead = pathname.startsWith("/api/export");

    if (isWriteOperation || isProtectedRead) {
      // Scripted writes may authenticate with the API token instead of a
      // session. User management stays session-only so a leaked token cannot
      // be used to grant roles, and the token buys no reads at all -- it
      // exists for unattended imports, not for pulling data out.
      if (
        isWriteOperation &&
        !pathname.startsWith("/api/users") &&
        isValidApiToken(req.headers.get("authorization"))
      ) {
        return NextResponse.next();
      }

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
