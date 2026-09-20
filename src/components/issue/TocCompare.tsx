"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Square,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useImagePan, useLightboxKeys } from "@/components/ui/lightbox";
import { formatIssueNumber } from "@/lib/issue-number";

/**
 * 目錄頁掃描，點開後左圖右目錄。
 *
 * 這裡刻意不是燈箱。掃描頁被讀的時候，讀的人幾乎都在**對照**：站上這一列的頁碼
 * 對不對、標題有沒有漏、這一欄底下的小標是不是各自成篇。單張放大的燈箱把目錄擋
 * 在後面，等於逼人在兩個畫面之間來回記，而那正是抄錯的地方。
 *
 * 所以整組掃描自己一條路：封面與其他圖片仍舊走 `IssueImages` 的燈箱（它們沒有
 * 可對照的東西），目錄頁走這裡。
 *
 * 右邊那一欄是**呼叫端算好的同一份目錄**（server component 傳進來的 children），
 * 不是另外再畫一次的簡表——對照用的清單跟頁面上的清單長得不一樣，就沒有對照的
 * 意義了。
 *
 * 所有控制項都貼在圖上，沒有頁首那一列：它們改的是左欄看到的東西，手要伸過大半個
 * 螢幕去按不合理，而讓出來的那一列全給了掃描。
 */
export function TocCompare({
  images,
  magazineName,
  issueNumber,
  children,
}: {
  images: string[];
  /** 這一期當時的刊名，不是今天的通行名——呼叫端已經算好了。 */
  magazineName: string;
  issueNumber: string;
  children: ReactNode;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // 整頁塞進半個視窗的掃描，字大概只剩原尺寸的一半——看得出哪一列，讀不清是什麼
  // 字。所以留一顆切換：貼齊高度是找位置用的，原尺寸是讀字用的，左欄自己捲。
  const [actualSize, setActualSize] = useState(false);
  // 一份目錄印成跨頁的時候，兩張掃描本來就是連著讀的。預設仍是單頁——按下去的是
  // 某一張縮圖，點了第 2 頁卻跳出 2、3 兩頁會嚇到人。
  const [spread, setSpread] = useState(false);
  const open = openIndex !== null;

  // 原尺寸時圖比欄大，左欄成了一個捲動區；抓住圖拖著看跟公開頁的燈箱同一套。
  const { ref: panRef, panProps } = useImagePan();

  // 雙頁時翻的是兩頁，而且 `openIndex` 一律是左邊那一張。
  const pageStep = spread ? 2 : 1;
  const shown =
    openIndex === null
      ? []
      : spread && openIndex + 1 < images.length
        ? [openIndex, openIndex + 1]
        : [openIndex];
  const last = shown.length > 0 ? shown[shown.length - 1] : 0;

  const step = (by: number) =>
    setOpenIndex((i) =>
      i === null
        ? i
        : Math.min(images.length - 1, Math.max(0, i + by * pageStep))
    );

  const toggleSpread = () =>
    setSpread((it) => {
      // 在最後一張上開雙頁，右邊沒有東西可擺；退一張，兩頁才都看得到。
      if (!it && openIndex === images.length - 1 && images.length > 1) {
        setOpenIndex(images.length - 2);
      }
      return !it;
    });

  // 只在開著的時候接手左右鍵：頁面上那兩顆鍵是捲動。這裡不綁上下鍵，右欄才捲得動。
  useLightboxKeys(open && images.length > 1, step);

  if (images.length === 0) return null;

  const label = (i: number) => (images.length > 1 ? `目錄頁 ${i + 1}` : "目錄頁");

  return (
    <>
      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">
          目錄頁掃描（點擊對照目錄）
        </p>
        <div className="flex flex-wrap gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              className="cursor-zoom-in overflow-hidden rounded border transition-colors hover:border-primary"
              onClick={() => setOpenIndex(i)}
              // 名字寫在 aria-label 上而不是只靠 title：可及名稱取的是按鈕內容
              // （圖的 alt），title 排在後面，於是讀出來的會是「目錄頁 1」，
              // 聽不出點下去會發生什麼。
              aria-label={`對照${label(i)}`}
              title={`對照${label(i)}`}
            >
              <Image
                src={src}
                alt={label(i)}
                width={120}
                height={160}
                unoptimized
                className="h-24 w-auto"
              />
            </button>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={(next) => !next && setOpenIndex(null)}>
        {/* 滿版的工作視窗，不是燈箱：兩邊都要看得見，所以背景是實色的，也沒有
            「點旁邊就關」——右欄本來就要點得到。h-[100dvh] 而不是 h-screen，
            手機瀏覽器的網址列會吃掉 vh 算出來的那幾十 px。 */}
        <DialogContent
          showCloseButton={false}
          className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-background p-0 sm:max-w-none"
        >
          {/* 窄螢幕上下疊：圖固定在上面一塊，目錄在底下自己捲。min-h-0 是必要的
              ——flex 子項的預設 min-height 是 auto，少了它兩欄都不會捲，整個
              視窗被內容撐長。 */}
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div className="relative h-[45dvh] shrink-0 bg-black/90 lg:h-auto lg:w-[62%] lg:shrink">
              {/* 標題也貼在圖上。它與控制項各佔上下一條，換來的是整個視窗少一列
                  頁首——掃描本來就是這個畫面裡最值得給空間的東西。 */}
              <DialogTitle className="absolute left-3 top-3 z-10 max-w-[calc(100%-1.5rem)] truncate rounded-full bg-black/70 px-3 py-1 text-sm font-medium text-white">
                {magazineName} {formatIssueNumber(issueNumber)} 目錄對照
              </DialogTitle>
              {/* 捲的是 inset-0 這一層，不是外框：原尺寸時圖比欄寬，而那排控制項
                  得留在原地，不能跟著捲出畫面。 */}
              {/* 底下留給那排控制項的一條，不然貼齊高度時膠囊會壓在掃描的最後
                  一行字上。內距而不是縮圖：置中是在扣掉內距之後算的。 */}
              <div
                ref={panRef}
                {...panProps}
                className={`absolute inset-0 flex overflow-auto p-2 pt-10 pb-14 lg:p-4 lg:pt-14 lg:pb-16 ${
                  actualSize ? "cursor-grab select-none active:cursor-grabbing" : ""
                }`}
              >
                {/* m-auto 而不是 items/justify-center：置中的 flex 子項一旦比容器
                    大，捲到頭也看不到它的左上角，而原尺寸的掃描正是比容器大。 */}
                <div className="m-auto flex items-start gap-2">
                  {shown.map((i) => (
                    /* eslint-disable-next-line @next/next/no-img-element -- 尺寸
                       是視窗算出來的，next/image 沒有固定尺寸或 fill 做不到。 */
                    <img
                      key={images[i]}
                      src={images[i]}
                      alt={label(i)}
                      // 不然按住拖會變成瀏覽器原生的「拖曳圖片」，pointermove
                      // 就再也收不到了。
                      draggable={false}
                      /* 貼齊高度那一邊用視窗算，不用 max-h-full：百分比高度要對得
                         上一個確定的父高，而這個 m-auto 的外框是內容撐出來的，高度
                         不確定，`full` 會靜靜地解成沒有上限然後整張圖爆出去。扣掉
                         的是標題列、左欄的內距，以及圖底下那排控制項。
                         寬度同理：雙頁時兩張各佔一半，也只能用視窗寬度去算，因為
                         外框的寬度是它們自己撐出來的。 */
                      className={
                        actualSize
                          ? "max-w-none"
                          : `max-h-[calc(45dvh-6rem)] w-auto object-contain lg:max-h-[calc(100dvh-7.5rem)] ${
                              shown.length > 1
                                ? "max-w-[46vw] lg:max-w-[29vw]"
                                : "max-w-full"
                            }`
                      }
                    />
                  ))}
                </div>
              </div>

              {/* 跟圖有關的都在這裡，就在圖的下緣。 */}
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-2">
                <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 rounded-full bg-black/70 px-2 py-1 text-white">
                  {images.length > 1 && (
                    <>
                      <PillButton
                        label="上一頁"
                        disabled={openIndex === 0}
                        onClick={() => step(-1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </PillButton>
                      <span className="px-1 text-sm tabular-nums">
                        {shown.length > 1
                          ? `${shown[0] + 1}–${last + 1}`
                          : `${last + 1}`}{" "}
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
                  <span className="mx-1 h-4 w-px bg-white/30" aria-hidden />
                  <PillButton label="關閉" onClick={() => setOpenIndex(null)}>
                    <X className="h-4 w-4" />
                  </PillButton>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 lg:border-l">
              {children}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** 深色膠囊上的一顆。名字只在 tooltip 與讀螢幕上，圖示要自己說得清楚。 */
function PillButton({
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
