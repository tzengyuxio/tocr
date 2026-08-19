import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-origin";

/**
 * `/admin` 擋掉是因為它整區都要登入，爬進去只會拿到轉址；`/api` 是同一個理由
 * 加上它回的是 JSON，不是給讀者看的頁面。`/auth` 是登入流程。
 *
 * 這不是防護——真正的權限在 middleware.ts。這裡只是別讓爬蟲浪費配額在必定
 * 拿不到內容的路徑上。
 */
export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/auth"],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
