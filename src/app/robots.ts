import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-origin";

/**
 * `/admin` 擋掉是因為它整區都要登入，爬進去只會拿到轉址；`/api` 是同一個理由
 * 加上它回的是 JSON，不是給讀者看的頁面。`/auth` 是登入流程。
 *
 * 這不是防護——真正的權限在 middleware.ts。這裡只是別讓爬蟲浪費配額在必定
 * 拿不到內容的路徑上。
 *
 * ## AI 爬蟲一律放行，這是決定不是預設值
 *
 * GPTBot、ClaudeBot、PerplexityBot、CCBot 這些都吃 `userAgent: "*"` 那條規則，
 * 所以它們現在讀得到全站——**而那正是我們要的**（yuxio 2026-08-22）。
 *
 * 這個站的價值在於「全世界只有這裡有那份目錄」。沒有人會用關鍵字搜「電腦玩家
 * 1999 年 5 月號有哪些文章」，但會這樣問模型；要讓模型答得出來、答得對、而且
 * 引得回這裡，前提是先讓它讀得到。擋掉訓練用爬蟲換得的是「內容不進訓練集」，
 * 但代價是答題引擎講到這批雜誌時只能靠別處的二手資料——對一個以被引用為目的
 * 的站，那是虧的。
 *
 * 所以這裡**不區分訓練用與即時檢索用**的爬蟲（GPTBot 對 ChatGPT-User、
 * ClaudeBot 對 Claude-Web），兩者都放行。要改變主意時，加一條具名的 `userAgent`
 * 規則覆寫即可——而不是把這段註解刪掉當作沒發生過。
 *
 * 給模型看的導覽在 `/llms.txt`。
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
