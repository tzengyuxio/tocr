import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * 缺封面時擺的圖。
 *
 * 兩張都是 3:4 的線稿：遊戲是一個空白的盒裝、雜誌是刊頭橫幅加上留白的封面骨架。
 * 刻意畫成骨架而不是插畫——它要說的是「這裡本來該有一張封面」，像得太過就會被
 * 當成封面本身。
 *
 * **小尺寸的欄位不要用這個**。`/games` 索引那個 56px 的方框、後台單期列表那個
 * 36px 的縮圖仍留著 lucide 圖示：圖示本來就是為小尺寸畫的，線稿縮到那個大小
 * 只剩一團灰。判準大約是「3:4 而且寬度 64px 以上」。
 *
 * 檔案是點陣圖，所以只有淺色一版。目前沒有影響——`.dark` 那組 token 有定義，但
 * `layout.tsx` 沒有掛 ThemeProvider，深色模式還走不到。真要開的時候，這兩張要嘛
 * 各出一份深色版，要嘛改成吃 `currentColor` 的 inline SVG。
 */
const PLACEHOLDERS = {
  game: { src: "/placeholders/game-cover.webp", label: "缺遊戲封面" },
  issue: { src: "/placeholders/issue-cover.webp", label: "缺單期封面" },
} as const;

export function CoverPlaceholder({
  kind,
  className,
}: {
  kind: keyof typeof PLACEHOLDERS;
  /** 外框的尺寸交給呼叫端，跟它替換掉的那個 div 一樣。 */
  className?: string;
}) {
  const { src, label } = PLACEHOLDERS[kind];

  return (
    <Image
      src={src}
      // 讀者從這張圖得不到任何關於這一期的資訊，所以對讀螢幕的人也不必唸出來。
      alt=""
      aria-hidden
      title={label}
      width={720}
      height={960}
      className={cn("aspect-[3/4] object-cover", className)}
    />
  );
}
