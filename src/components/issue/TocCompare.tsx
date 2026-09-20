"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TocScanPane } from "@/components/issue/TocScanPane";
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
 * 看掃描本身的那一半在 `TocScanPane`，跟後台複查畫面共用。
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

      <Dialog
        open={openIndex !== null}
        onOpenChange={(next) => !next && setOpenIndex(null)}
      >
        {/* 滿版的工作視窗，不是燈箱：兩邊都要看得見，所以背景是實色的，也沒有
            「點旁邊就關」——右欄本來就要點得到。h-[100dvh] 而不是 h-screen，
            手機瀏覽器的網址列會吃掉 vh 算出來的那幾十 px。 */}
        <DialogContent
          showCloseButton={false}
          className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-background p-0 sm:max-w-none"
        >
          {openIndex !== null && (
            /* 窄螢幕上下疊：圖固定在上面一塊，目錄在底下自己捲。min-h-0 是必要的
               ——flex 子項的預設 min-height 是 auto，少了它兩欄都不會捲，整個視窗
               被內容撐長。 */
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <TocScanPane
                images={images}
                index={openIndex}
                onIndexChange={setOpenIndex}
                keyboard
                className="h-[45dvh] shrink-0 lg:h-auto lg:w-[62%] lg:shrink"
                title={
                  /* 標題也貼在圖上。它與控制項各佔上下一條，換來的是整個視窗少一
                     列頁首——掃描本來就是這個畫面裡最值得給空間的東西。 */
                  <DialogTitle className="absolute left-3 top-3 z-10 max-w-[calc(100%-4.5rem)] truncate rounded-full bg-black/70 px-3 py-1 text-sm font-medium text-white">
                    {magazineName} {formatIssueNumber(issueNumber)} 目錄對照
                  </DialogTitle>
                }
                corner={
                  /* 關閉在右上角，不在底下那排：那排是「怎麼看這張圖」，關掉不是
                     其中一種看法，而右上角是關窗本來就會去找的地方。 */
                  <button
                    type="button"
                    aria-label="關閉"
                    className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
                    onClick={() => setOpenIndex(null)}
                  >
                    <X className="h-5 w-5" />
                  </button>
                }
                onBackgroundClick={() => setOpenIndex(null)}
              />

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 lg:border-l">
                {children}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
