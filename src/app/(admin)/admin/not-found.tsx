import { NotFoundNotice } from "@/components/NotFoundNotice";

/**
 * 後台的 `notFound()` 落點。
 *
 * 有這一份，`/admin/magazines/<不存在的 id>` 這種找不到資料的網址，側邊欄還在，
 * 缺的只是內容——`(admin)` 的 layout 會照常渲染。
 *
 * **完全對不上路由的網址（`/admin/沒這頁`）走的仍是根目錄那份**，因為那時候沒有
 * 任何 route 被匹配，Next.js 也就無從得知該用哪一層的 not-found。這是框架的行為，
 * 不是漏掉。
 *
 * 目錄只有一條：後台是工具，側邊欄就在旁邊，玩前台那套專欄名沒有意義。
 */
export const metadata = { title: "找不到頁面" };

export default function AdminNotFound() {
  return (
    <NotFoundNotice
      title="找不到這個頁面"
      description="這筆資料可能已經被刪除，或網址打錯了。"
      entries={[{ label: "回儀表板", href: "/admin", page: "001" }]}
    />
  );
}
