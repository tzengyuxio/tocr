import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isDevBypass } from "@/lib/dev-auth";
import { isValidApiToken } from "@/lib/api-token";
import { resolveApiToken } from "@/lib/user-api-token";

/** Endpoints no token may touch, however valid it is. */
const SESSION_ONLY_PATHS = ["/api/users", "/api/tokens"];

/**
 * 後台裡只有 ADMIN 進得去的幾頁。側欄本來就不會把它們畫給 EDITOR，但藏起來不是
 * 擋住——網址還是打得進來。
 *
 * 收成一份清單，是因為漏掉的那一頁不會有任何徵兆：頁面各自也有 notFound() 的
 * 防線，所以少列一條的後果只是「同樣是進不去，但一個轉址、一個 404」，看不出來。
 * 匯出紀錄就是這樣漏了。
 */
const ADMIN_ONLY_PATHS = [
  "/admin/users",
  "/admin/edit-logs",
  "/admin/export-logs",
];

export default auth(async (req) => {
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

    if (
      ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p)) &&
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
      // Scripted writes may authenticate with an API token instead of a
      // session -- either the shared env-var one or a contributor's own.
      // Account and token management stay session-only so a leaked token can
      // neither grant roles nor mint another token, and no token buys a read
      // at all: they exist for writing data in, not for pulling it out.
      if (isWriteOperation && !SESSION_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
        const authorization = req.headers.get("authorization");
        if (isValidApiToken(authorization)) {
          return NextResponse.next();
        }
        // A per-user token is a database lookup, so it goes second: the header
        // has to be one of ours before it is worth a round trip.
        if (await resolveApiToken(authorization)) {
          return NextResponse.next();
        }
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
