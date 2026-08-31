"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { CoverPlaceholder } from "@/components/CoverPlaceholder";
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
  tocImages: string[];
  photos: IssuePhoto[];
  issueNumber: string;
}

/**
 * The cover and the scanned tables of contents, side by side with the index
 * they describe. Any of them opens full size, so a reader can check the list
 * against the page it was read off.
 */
export function IssueImages({
  coverImage,
  tocImages,
  photos,
  issueNumber,
}: IssueImagesProps) {
  // One list so the lightbox can page through cover and scans together.
  const images = [
    ...(coverImage ? [{ src: coverImage, label: "封面" }] : []),
    ...tocImages.map((src, i) => ({
      src,
      label: tocImages.length > 1 ? `目錄頁 ${i + 1}` : "目錄頁",
    })),
    ...photos.map((photo, i) => ({
      src: photo.url,
      label: photo.caption ?? photo.sourceName ?? `其他圖片 ${i + 1}`,
    })),
  ];
  const photoOffset = (coverImage ? 1 : 0) + tocImages.length;
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);
  const zoomed = zoomedIndex === null ? null : images[zoomedIndex];

  return (
    <>
      {/* Side by side on a narrow screen, where stacking them cost a whole
          screenful before the index started. */}
      <div className="flex gap-3 lg:block lg:space-y-3">
        {coverImage ? (
          <button
            type="button"
            // Narrow screens stack the columns, where a full-width cover would
            // be a screenful on its own before the index starts.
            className="block w-32 shrink-0 cursor-zoom-in self-start overflow-hidden rounded-lg shadow-md transition-shadow hover:shadow-lg sm:w-40 lg:w-full"
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
        ) : (
          <CoverPlaceholder
            kind="issue"
            className="w-32 shrink-0 self-start rounded-lg sm:w-40 lg:w-full"
          />
        )}

        {tocImages.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">
              目錄頁掃描（點擊放大）
            </p>
            <div className="flex flex-wrap gap-2">
              {tocImages.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  className="cursor-zoom-in overflow-hidden rounded border transition-colors hover:border-primary"
                  onClick={() => setZoomedIndex((coverImage ? 1 : 0) + i)}
                  title={`放大目錄頁 ${i + 1}`}
                >
                  <Image
                    src={src}
                    alt={`目錄頁 ${i + 1}`}
                    width={120}
                    height={160}
                    unoptimized
                    className="h-24 w-auto"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

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
                    {/* 來源兩欄皆空的是本站藏品，什麼都不標——那正是它與外部
                        來源在畫面上的分野。 */}
                    {photo.sourceName && (
                      <p>
                        來源：
                        {photo.sourceUrl ? (
                          <a
                            href={photo.sourceUrl}
                            target="_blank"
                            rel="nofollow noopener"
                            className="underline underline-offset-2 hover:text-foreground"
                          >
                            {photo.sourceName}
                          </a>
                        ) : (
                          photo.sourceName
                        )}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Dialog
        open={zoomed !== null}
        onOpenChange={(open) => !open && setZoomedIndex(null)}
      >
        {/* A lightbox, not a panel: transparent content so the dim overlay
            shows the page behind, and a click anywhere off the image closes
            it. Same shape as the OCR review screen's viewer. */}
        <DialogContent
          showCloseButton={false}
          className="flex h-screen w-screen max-w-none items-center justify-center border-0 bg-black/[0.64] p-0 shadow-none sm:max-w-none"
          onClick={() => setZoomedIndex(null)}
        >
          <DialogTitle className="sr-only">
            {formatIssueNumber(issueNumber)} {zoomed?.label}
          </DialogTitle>
          <button
            type="button"
            aria-label="關閉"
            className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
            onClick={() => setZoomedIndex(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {zoomed && (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element -- the
                  lightbox sizes itself to the viewport, which next/image
                  cannot do without fixed dimensions or fill. */}
              <img
                src={zoomed.src}
                alt={zoomed.label}
                className="max-h-[94vh] w-auto max-w-[94vw] object-contain"
              />
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full bg-black/60 px-4 py-2 text-white">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
                    disabled={zoomedIndex === 0}
                    onClick={() => setZoomedIndex((i) => (i ?? 0) - 1)}
                    aria-label="上一張"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <span className="text-sm">{zoomed.label}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
                    disabled={zoomedIndex === images.length - 1}
                    onClick={() => setZoomedIndex((i) => (i ?? 0) + 1)}
                    aria-label="下一張"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
