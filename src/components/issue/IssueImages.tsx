"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from "lucide-react";
import { LightboxArrow, useImagePan, useLightboxKeys } from "@/components/ui/lightbox";
import { cn } from "@/lib/utils";
import { CoverPlaceholder } from "@/components/CoverPlaceholder";
import { TocCompare } from "@/components/issue/TocCompare";
import { formatIssueNumber } from "@/lib/issue-number";

/** 掛在這一期的額外圖片，公開的那些。 */
export interface IssuePhoto {
  url: string;
  caption: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
}

interface IssueImagesProps {
  coverImage: string | null;
  /** 封面圖的出處；本站自己的掃描兩欄都是 null。網址已經過 `publicSourceUrl`。 */
  coverSource: { name: string | null; url: string | null };
  tocImages: string[];
  photos: IssuePhoto[];
  magazineName: string;
  issueNumber: string;
  /** 這一期的目錄，交給掃描對照視窗當右欄用。見 `TocCompare`。 */
  tocList: ReactNode;
}

/**
 * The cover and the scanned tables of contents, side by side with the index
 * they describe. Any of them opens full size, so a reader can check the list
 * against the page it was read off.
 */
export function IssueImages({
  coverImage,
  coverSource,
  tocImages,
  photos,
  magazineName,
  issueNumber,
  tocList,
}: IssueImagesProps) {
  // 封面與其他圖片同一串，燈箱因此翻得過去。**目錄頁不在裡面**：它點開的是左圖
  // 右目錄的對照視窗（`TocCompare`），同一張圖有兩種點法只會讓人搞不清楚自己會
  // 看到什麼。
  const images = [
    ...(coverImage ? [{ src: coverImage, label: "封面" }] : []),
    ...photos.map((photo, i) => ({
      src: photo.url,
      label: photo.caption ?? photo.sourceName ?? `其他圖片 ${i + 1}`,
    })),
  ];
  const photoOffset = coverImage ? 1 : 0;
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);
  const zoomed = zoomedIndex === null ? null : images[zoomedIndex];
  // 貼齊視窗只看得出這是什麼，看不清印了什麼。封面上的日期、書條上的定價、拍賣
  // 照片裡的刊名都在原尺寸那一邊，而一張比視窗大的圖要拖得動才有用。
  const [actualSize, setActualSize] = useState(false);
  const { ref: panRef, panProps, didPan } = useImagePan();

  const close = () => {
    setZoomedIndex(null);
    setActualSize(false);
  };

  const step = (by: number) => {
    // 換一張就回到貼齊視窗：上一張捲到哪裡，跟下一張沒有關係。
    setActualSize(false);
    setZoomedIndex((i) =>
      i === null ? i : Math.min(images.length - 1, Math.max(0, i + by)),
    );
  };

  // Only while enlarged: on the page itself the arrow keys scroll.
  useLightboxKeys(zoomed !== null && images.length > 1, step);

  return (
    <>
      {/* Side by side on a narrow screen, where stacking them cost a whole
          screenful before the index started. */}
      <div className="flex gap-3 lg:block lg:space-y-3">
        {coverImage ? (
          // Narrow screens stack the columns, where a full-width cover would
          // be a screenful on its own before the index starts.
          <div className="w-32 shrink-0 self-start sm:w-40 lg:w-full">
            <button
              type="button"
              className="block w-full cursor-zoom-in overflow-hidden rounded-lg shadow-md transition-shadow hover:shadow-lg"
              onClick={() => setZoomedIndex(0)}
              title="放大封面"
            >
              <Image
                src={coverImage}
                alt={`${formatIssueNumber(issueNumber)} 封面`}
                width={400}
                height={560}
                unoptimized
                className="w-full"
              />
            </button>
            <SourceLine
              name={coverSource.name}
              url={coverSource.url}
              className="mt-1.5 text-xs text-muted-foreground"
            />
          </div>
        ) : (
          <CoverPlaceholder
            kind="issue"
            className="w-32 shrink-0 self-start rounded-lg sm:w-40 lg:w-full"
          />
        )}

        <TocCompare
          images={tocImages}
          magazineName={magazineName}
          issueNumber={issueNumber}
        >
          {tocList}
        </TocCompare>

        {photos.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">
              其他圖片（點擊放大）
            </p>
            <ul className="space-y-2">
              {photos.map((photo, i) => (
                <li key={photo.url} className="flex gap-2">
                  <button
                    type="button"
                    className="shrink-0 cursor-zoom-in overflow-hidden rounded border transition-colors hover:border-primary"
                    onClick={() => setZoomedIndex(photoOffset + i)}
                    title="放大"
                  >
                    <Image
                      src={photo.url}
                      alt={photo.caption ?? "其他圖片"}
                      width={120}
                      height={160}
                      unoptimized
                      className="h-24 w-auto"
                    />
                  </button>
                  <div className="min-w-0 text-xs text-muted-foreground">
                    {photo.caption && <p>{photo.caption}</p>}
                    <SourceLine name={photo.sourceName} url={photo.sourceUrl} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Dialog open={zoomed !== null} onOpenChange={(open) => !open && close()}>
        {/* A lightbox, not a panel: transparent content so the dim overlay
            shows the page behind, and a click anywhere off the image closes
            it. */}
        <DialogContent
          showCloseButton={false}
          className="h-screen w-screen max-w-none border-0 bg-black/[0.64] p-0 shadow-none sm:max-w-none"
        >
          <DialogTitle className="sr-only">
            {formatIssueNumber(issueNumber)} {zoomed?.label}
          </DialogTitle>

          {zoomed && (
            /* 捲動的那一層自己鋪滿整個燈箱，圖用 m-auto 在裡面置中——置中的 flex
               子項一旦比容器大，捲到頭也看不到它的左上角，而原尺寸的封面正是比
               容器大。點在圖以外的地方關掉，但**拖過就不算點**：原尺寸下拖到一半
               放開手，那是在看圖不是要關掉它。 */
            <div
              ref={panRef}
              {...panProps}
              onClick={() => {
                if (!didPan()) close();
              }}
              className={cn(
                "absolute inset-0 flex overflow-auto p-4",
                actualSize && "cursor-grab select-none active:cursor-grabbing"
              )}
            >
              <div className="m-auto">
                {/* eslint-disable-next-line @next/next/no-img-element -- the
                    lightbox sizes itself to the viewport, which next/image
                    cannot do without fixed dimensions or fill. */}
                <img
                  src={zoomed.src}
                  alt={zoomed.label}
                  draggable={false}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!didPan()) setActualSize((it) => !it);
                  }}
                  className={
                    actualSize
                      ? "max-w-none"
                      : "max-h-[86vh] w-auto max-w-[92vw] cursor-zoom-in object-contain"
                  }
                />
              </div>
            </div>
          )}

          <button
            type="button"
            aria-label="關閉"
            className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
            onClick={close}
          >
            <X className="h-5 w-5" />
          </button>
          {zoomed && images.length > 1 && (
            <>
              <LightboxArrow
                side="left"
                label="上一張"
                disabled={zoomedIndex === 0}
                onClick={() => step(-1)}
              />
              <LightboxArrow
                side="right"
                label="下一張"
                disabled={zoomedIndex === images.length - 1}
                onClick={() => step(1)}
              />
            </>
          )}

          {/* 控制項不在圖上而在燈箱上：原尺寸時圖比框大、還會被拖著走，擺在圖上
              的東西會跟著捲出畫面。 */}
          {zoomed && (
            <div className="absolute inset-x-0 bottom-4 flex justify-center px-4">
              <div className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full bg-black/60 px-4 py-2 text-white">
                {images.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
                    disabled={zoomedIndex === 0}
                    onClick={() => step(-1)}
                    aria-label="上一張"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}
                <span className="max-w-[50vw] truncate text-sm">{zoomed.label}</span>
                {images.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
                    disabled={zoomedIndex === images.length - 1}
                    onClick={() => step(1)}
                    aria-label="下一張"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                )}
                <span className="mx-1 h-4 w-px bg-white/30" aria-hidden />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
                  aria-label={actualSize ? "貼齊視窗" : "原尺寸"}
                  title={actualSize ? "貼齊視窗" : "原尺寸"}
                  onClick={() => setActualSize((it) => !it)}
                >
                  {actualSize ? (
                    <Minimize2 className="h-5 w-5" />
                  ) : (
                    <Maximize2 className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * 「來源：某某」一行。沒填名字就什麼都不標——標得出出處的圖與標不出的，在畫面上
 * 因此分得開。
 */
function SourceLine({
  name,
  url,
  className,
}: {
  name: string | null;
  url: string | null;
  className?: string;
}) {
  if (!name) return null;
  return (
    <p className={className}>
      來源：
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="nofollow noopener"
          className="underline underline-offset-2 hover:text-foreground"
        >
          {name}
        </a>
      ) : (
        name
      )}
    </p>
  );
}
