"use client";

import { useState, type ReactNode } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImagePan, useLightboxKeys } from "@/components/ui/lightbox";
import { cn } from "@/lib/utils";

/**
 * 一疊目錄頁掃描，加上看它需要的那幾顆。
 *
 * 公開的單期頁與後台的複查畫面用的是同一份：兩邊做的是同一件事——把掃描擺在條目
 * 旁邊逐列對——只是一邊在讀、一邊在改。翻頁、雙頁並列、原尺寸、拖著看的行為因此
 * 不該有兩套。
 *
 * 外框的尺寸由呼叫端決定（公開頁是對照視窗的左欄，後台是黏在側邊的那一塊或整個
 * 畫面），這裡只保證：圖在框裡置中、比框大的時候捲得動也拖得動、控制項不會跟著
 * 捲走。
 *
 * `index` 由呼叫端拿著——縮圖點哪一張、複查到第幾頁，都是外面的事。雙頁與原尺寸
 * 則是純粹的看法，留在這裡。
 */
export function TocScanPane({
  images,
  index,
  onIndexChange,
  keyboard = false,
  title,
  actions,
  className,
}: {
  images: string[];
  index: number;
  onIndexChange: (index: number) => void;
  /** 左右鍵翻頁。畫面上還有別的東西要用方向鍵時關掉。 */
  keyboard?: boolean;
  /** 疊在左上角的一行，通常是刊名期號。 */
  title?: ReactNode;
  /** 接在膠囊右端的按鈕，例如關閉或全螢幕。 */
  actions?: ReactNode;
  className?: string;
}) {
  // 整頁塞進半個視窗的掃描，字大概只剩原尺寸的一半——看得出哪一列，讀不清是什麼
  // 字。所以留一顆切換：貼齊高度是找位置用的，原尺寸是讀字用的，框自己捲。
  const [actualSize, setActualSize] = useState(false);
  // 一份目錄印成跨頁的時候，兩張掃描本來就是連著讀的。預設仍是單頁——按下去的是
  // 某一張縮圖，點了第 2 頁卻跳出 2、3 兩頁會嚇到人。
  const [spread, setSpread] = useState(false);
  const { ref: panRef, panProps } = useImagePan();

  // 雙頁時翻的是兩頁，而且 `index` 一律是左邊那一張。
  const shown =
    spread && index + 1 < images.length ? [index, index + 1] : [index];
  const last = shown[shown.length - 1];

  const step = (by: number) =>
    onIndexChange(
      Math.min(images.length - 1, Math.max(0, index + by * (spread ? 2 : 1)))
    );

  const toggleSpread = () => {
    // 在最後一張上開雙頁，右邊沒有東西可擺；退一張，兩頁才都看得到。
    if (!spread && index === images.length - 1 && images.length > 1) {
      onIndexChange(images.length - 2);
    }
    setSpread((it) => !it);
  };

  useLightboxKeys(keyboard && images.length > 1, step);

  if (images.length === 0) return null;

  const label = (i: number) => (images.length > 1 ? `目錄頁 ${i + 1}` : "目錄頁");

  return (
    <div className={cn("relative bg-black/90", className)}>
      {title}

      {/* 捲的是 inset-0 這一層，不是外框：原尺寸時圖比框寬，而那排控制項得留在
          原地，不能跟著捲出畫面。 */}
      <div
        ref={panRef}
        {...panProps}
        className={cn(
          // 底下留給控制項的一條，上面留給標題的一條，不然它們會壓在掃描的字上。
          "absolute inset-0 flex overflow-auto p-2 pt-10 pb-14 lg:p-4 lg:pt-14 lg:pb-16",
          actualSize && "cursor-grab select-none active:cursor-grabbing"
        )}
      >
        {/* 兩種模式的外框不一樣，因為它們要的東西相反。
            貼齊：外框撐滿（`h-full w-full`），圖的 `max-h-full` 才有一個確定的父
            高可以對——高度百分比對不上不確定的父高時會靜靜解成沒有上限，然後整張
            圖爆出去。
            原尺寸：外框改成 `m-auto` 收成內容的大小。置中的 flex 子項一旦比容器
            大，捲到頭也看不到它的左上角，而原尺寸的掃描正是比容器大。 */}
        <div
          className={cn(
            "flex gap-2",
            actualSize
              ? "m-auto items-start"
              : "h-full w-full items-center justify-center"
          )}
        >
          {shown.map((i) => (
            /* eslint-disable-next-line @next/next/no-img-element -- 尺寸是框算
               出來的，next/image 沒有固定尺寸或 fill 做不到。 */
            <img
              key={images[i]}
              src={images[i]}
              alt={label(i)}
              // 不然按住拖會變成瀏覽器原生的「拖曳圖片」，pointermove 就再也收不
              // 到了。
              draggable={false}
              className={
                actualSize
                  ? "max-w-none"
                  : cn(
                      "max-h-full w-auto object-contain",
                      shown.length > 1 ? "max-w-[calc(50%-0.25rem)]" : "max-w-full"
                    )
              }
            />
          ))}
        </div>
      </div>

      {/* 跟圖有關的都在這裡，就在圖的下緣——它們改的是這一塊看到的東西，手要伸到
          畫面另一頭去按不合理。 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-2">
        <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 rounded-full bg-black/70 px-2 py-1 text-white">
          {images.length > 1 && (
            <>
              <PillButton
                label="上一頁"
                disabled={index === 0}
                onClick={() => step(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </PillButton>
              <span className="px-1 text-sm tabular-nums">
                {shown.length > 1 ? `${shown[0] + 1}–${last + 1}` : `${last + 1}`}{" "}
                / {images.length}
              </span>
              <PillButton
                label="下一頁"
                disabled={last === images.length - 1}
                onClick={() => step(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </PillButton>
              <span className="mx-1 h-4 w-px bg-white/30" aria-hidden />
              <PillButton
                label={spread ? "改為單頁" : "改為雙頁並列"}
                onClick={toggleSpread}
              >
                {spread ? (
                  <Square className="h-4 w-4" />
                ) : (
                  <BookOpen className="h-4 w-4" />
                )}
              </PillButton>
            </>
          )}
          <PillButton
            label={actualSize ? "貼齊高度" : "原尺寸"}
            onClick={() => setActualSize((it) => !it)}
          >
            {actualSize ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </PillButton>
          {actions}
        </div>
      </div>
    </div>
  );
}

/** 深色膠囊上的一顆。名字只在 tooltip 與讀螢幕上，圖示要自己說得清楚。 */
export function PillButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-white hover:bg-white/20 hover:text-white disabled:opacity-30"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
