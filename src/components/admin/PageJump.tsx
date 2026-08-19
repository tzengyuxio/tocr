"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * 直接跳到某一頁，同時就是「現在在第幾頁」的顯示。
 *
 * 數字鍵只擺得下幾顆，而遊戲有三十幾頁——沒有這個框，要看第 20 頁得按十幾次
 * 「下一頁」，每按一次都是一趟請求。
 *
 * 框裡放的是目前頁碼而不是空白：這樣「第 X / Y 頁」不必另外佔一列，而要跳頁的人
 * 看到的也是一個已經有內容、改掉即可的欄位。呼叫端只在頁數超過數字鍵走得到的
 * 範圍時才掛上來：三頁的清單擺一個跳頁框是多的。
 */
export function PageJump({
  page,
  totalPages,
  onJump,
}: {
  page: number;
  totalPages: number;
  onJump: (page: number) => void;
}) {
  // null 表示「沒人在編輯」，顯示的就是目前頁碼。存成字串會變成一份要同步的
  // 副本——換頁的路徑不只這個框，數字鍵與上下一頁都會換，而每個同步點都是一次
  // 忘記同步的機會。
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? String(page);

  const jump = () => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      setDraft(null);
      return;
    }
    setDraft(null);
    // 夾在範圍內而不是報錯：打 999 的人要的是最後一頁，不是一則錯誤訊息。
    onJump(Math.min(Math.max(parsed, 1), totalPages));
  };

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {/* aria-label rather than a <Label className="sr-only">: an attribute has
          no box, so there is nothing to lay out, clip or escape. sr-only is
          position:absolute, and one at the foot of a long page was enough to
          give /admin/articles a second scrollbar -- see the note on <main> in
          the admin layout, which is where that is now prevented. */}
      <Input
        aria-label="跳至"
        type="number"
        min={1}
        max={totalPages}
        value={value}
        title="輸入頁碼後按 Enter 跳頁"
        onChange={(e) => setDraft(e.target.value)}
        // 打到一半離開就還原：留著一個沒送出的數字，讀起來像是已經在那一頁。
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            jump();
          }
        }}
        className="h-8 w-14 text-center"
      />
      <span>/ {totalPages} 頁</span>
    </div>
  );
}
