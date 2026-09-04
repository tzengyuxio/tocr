import type { NotFoundEntry } from "@/components/NotFoundNotice";

/**
 * 前台 404 目錄頁的條目。根目錄與 `(public)` 兩份 not-found 共用同一張目錄。
 *
 * 專欄名對到站上的公開頁。沒有對應頁面的就不給 `href`，渲染成「本期休刊」——
 * 哪天真的做了關於頁或回饋管道，把網址補上就會自己亮起來。頁碼是假的，遞增就好。
 */
export const publicContents: NotFoundEntry[] = [
  { label: "卷頭語", href: "/", page: "001" },
  { label: "本期新刊", href: "/magazines", page: "012" },
  { label: "遊戲大觀園", href: "/games", page: "028" },
  { label: "攻略情報站", href: "/tags", page: "046" },
  { label: "編輯視窗", page: "058" },
  { label: "讀者信箱", page: "072" },
  { label: "排行榜", href: "/contributors", page: "088" },
  { label: "索引檢索", href: "/search", page: "096" },
];
