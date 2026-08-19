"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * 直接跳到某一頁。
 *
 * 數字鍵只擺得下幾顆，而遊戲有三十幾頁——沒有這個框，要看第 20 頁得按十幾次
 * 「下一頁」，每按一次都是一趟請求。呼叫端只在頁數超過數字鍵走得到的範圍時才
 * 掛上來：三頁的清單擺一個跳頁框是多的。
 */
export function PageJump({
  totalPages,
  onJump,
}: {
  totalPages: number;
  onJump: (page: number) => void;
}) {
  const [draft, setDraft] = useState("");
  // 一頁只會有一個跳頁框，但 id 寫死的話，日後第二個清單共用這支元件就會撞號，
  // 而撞號的後果是點了標籤跑去另一個框。
  const inputId = useId();

  const jump = () => {
    const parsed = Number.parseInt(draft, 10);
    if (!Number.isFinite(parsed)) return;
    // 夾在範圍內而不是報錯：打 999 的人要的是最後一頁，不是一則錯誤訊息。
    onJump(Math.min(Math.max(parsed, 1), totalPages));
    setDraft("");
  };

  return (
    <div className="flex items-center gap-1">
      <Label htmlFor={inputId} className="text-sm font-normal text-muted-foreground">
        跳至
      </Label>
      <Input
        id={inputId}
        type="number"
        min={1}
        max={totalPages}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            jump();
          }
        }}
        className="h-8 w-16"
      />
      <Button variant="outline" size="sm" onClick={jump} disabled={!draft.trim()}>
        前往
      </Button>
    </div>
  );
}
