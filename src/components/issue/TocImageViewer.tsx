"use client";

import { useState } from "react";
import { Fullscreen, Shrink } from "lucide-react";
import { PillButton, TocScanPane } from "@/components/issue/TocScanPane";
import { cn } from "@/lib/utils";

/**
 * 複查目錄時看的那一塊掃描，就在被複查的列表旁邊。
 *
 * 跟公開單期頁的對照視窗是同一個元件（`TocScanPane`）：兩邊做的是同一件事，只是
 * 一邊在讀、一邊在改。
 *
 * **全螢幕不是燈箱。** 它原本開的是單張放大的燈箱，而那會把正在對的列表整個蓋掉
 * ——複查的人要嘛記著、要嘛關掉再開。現在那顆改成把「掃描＋列表」這一整塊撐滿畫
 * 面，列表還在右邊、還能編。切換只改外框的 class，列表那棵樹不會重掛，所以正在
 * 改的那一列不會被切掉。
 */
export function TocImageViewer({
  images,
  fullscreen = false,
  onToggleFullscreen,
}: {
  images: string[];
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) return null;

  return (
    <TocScanPane
      images={images}
      index={index}
      onIndexChange={setIndex}
      // 只有全螢幕時才接手左右鍵：貼在頁面上的時候，那兩顆鍵屬於正在改的那個欄位。
      keyboard={fullscreen}
      className={cn(
        "rounded-lg",
        // 比 scrollport 高的 sticky 區塊永遠碰不到自己的底，所以高度扣掉的是
        // 後台的 3.5rem 頁首、main 的上下內距與這一塊自己的 top 偏移。
        fullscreen ? "h-full w-full" : "sticky top-4 h-[calc(100vh-8rem)]"
      )}
      actions={
        onToggleFullscreen && (
          <>
            <span className="mx-1 h-4 w-px bg-white/30" aria-hidden />
            <PillButton
              label={fullscreen ? "離開全螢幕對照" : "全螢幕對照"}
              onClick={onToggleFullscreen}
            >
              {fullscreen ? (
                <Shrink className="h-4 w-4" />
              ) : (
                <Fullscreen className="h-4 w-4" />
              )}
            </PillButton>
          </>
        )
      }
    />
  );
}
