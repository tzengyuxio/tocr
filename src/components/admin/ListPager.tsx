"use client";

import { Button } from "@/components/ui/button";
import { PageJump } from "@/components/admin/PageJump";

/**
 * 後台清單的分頁列。
 *
 * 遊戲與文章兩份清單本來各有一份一模一樣的實作，兩邊都只擺得出五顆數字鍵、
 * 都沒說總共幾頁——同一個缺陷修兩次，正是該收成一份的訊號。
 *
 * 伺服器渲染的清單（/admin/issues、/admin/edit-logs、/admin/export-logs）另有
 * 一套以 Link 換頁的分頁列，狀態在網址上。這支是給狀態在 useState 裡的清單用的，
 * 兩者的措辭（「第 X / Y 頁」）刻意一致。
 */
const PAGE_WINDOW = 5;

export function ListPager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    /* 置中而非左右對齊：靠著兩端時，看完頁碼再去按鍵要橫跨整個表格寬度，
       而清單越寬跨得越遠。控制項擺在中線，手與眼都不必來回。 */
    <div className="mt-6 flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          上一頁
        </Button>
        <div className="flex items-center gap-1">
          {pageWindow(page, totalPages).map((pageNum) => (
            <Button
              key={pageNum}
              variant={pageNum === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPage(pageNum)}
            >
              {pageNum}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          下一頁
        </Button>
        {/* 三頁的清單擺一個跳頁框是多的：數字鍵已經走得到每一頁。 */}
        {totalPages > PAGE_WINDOW && (
          <PageJump totalPages={totalPages} onJump={onPage} />
        )}
      </div>
      {/* 數字鍵只走得到附近幾頁，讀者仍需要知道自己站在多長的一條路上。 */}
      <p className="text-sm text-muted-foreground">
        第 {page} / {totalPages} 頁
      </p>
    </div>
  );
}

/** 目前這一頁附近的頁碼，靠到頭尾時往回貼齊，數量才不會縮水。 */
function pageWindow(page: number, totalPages: number): number[] {
  const size = Math.min(PAGE_WINDOW, totalPages);
  const first = Math.min(
    Math.max(page - Math.floor(PAGE_WINDOW / 2), 1),
    Math.max(totalPages - PAGE_WINDOW + 1, 1)
  );
  return Array.from({ length: size }, (_, i) => first + i);
}
