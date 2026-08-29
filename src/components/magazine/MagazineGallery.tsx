"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { GalleryImage } from "@/lib/magazine-gallery";

export type { GalleryImage };

/**
 * The magazine's pictures, in the column beside its details.
 *
 * One frame rather than a masthead here and a row of photographs below: a
 * masthead is wide and short, so the column is short and wide too, and hanging
 * the shelf photographs underneath the details grew the page by a band of
 * mostly-empty space. Here they cost nothing -- the frame is already that size.
 *
 * The pictures are the mastheads in period order (or, for a magazine that has
 * none, its earliest issue's cover), then photographs of the physical copies.
 * What goes in and in what order is buildMagazineGallery's job, not this one's.
 */
export function MagazineGallery({
  images,
  name,
  initialIndex = 0,
}: {
  images: GalleryImage[];
  name: string;
  /** 改過名的刊有多張刊頭，進頁時停在代表圖而不是最早的那個時期。 */
  initialIndex?: number;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  if (images.length === 0) return null;
  const current = images[Math.min(index, images.length - 1)];
  const many = images.length > 1;
  const alt = current.note ? `${name}：${current.note}` : name;

  const step = (by: number) =>
    setIndex((i) => Math.min(images.length - 1, Math.max(0, i + by)));

  return (
    <>
      {/* self-stretch is what makes the column as tall as the details beside
          it: the row's height comes from the text, and the flex item matches
          it. min-h keeps it from collapsing when the details are only a line
          or two -- and on mobile, where the row is a column and there is no
          sibling height to match.

          The column is wide because a masthead is wide: 軟體世界's is 795x235,
          so width, not height, is what limits it. */}
      <div className="flex w-full shrink-0 flex-col gap-1 self-stretch md:w-80 lg:w-[26rem]">
        <div className="relative min-h-40 w-full flex-1 overflow-hidden rounded-lg bg-muted/30">
          {/* The arrows sit beside this button rather than inside it: a button
              inside a button is invalid, and the browser drops one of them. */}
          <button
            type="button"
            aria-label={`放大檢視 ${alt}`}
            onClick={() => setIsZoomed(true)}
            className="absolute inset-0 cursor-zoom-in transition-colors hover:bg-muted/30"
          >
            {/* fill, not fixed dimensions: the box is sized by the row beside
                it, and object-contain keeps a wide masthead from being
                cropped. */}
            <Image
              src={current.url}
              alt={alt}
              fill
              unoptimized
              sizes="(min-width: 1024px) 26rem, (min-width: 768px) 20rem, 100vw"
              className="object-contain p-3"
            />
          </button>

          {many && (
            <>
              <GalleryArrow
                side="left"
                label="上一張"
                disabled={index === 0}
                onClick={() => step(-1)}
              />
              <GalleryArrow
                side="right"
                label="下一張"
                disabled={index === images.length - 1}
                onClick={() => step(1)}
              />
            </>
          )}
        </div>

        {(current.note || many) && (
          /* The arrows repeat here, beside the counter, because the pair over
             the image only appears once the pointer is near it -- and on a
             touch screen not at all. This row is the one that is always
             visible, so it carries the controls that have to be found. */
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="min-w-0 truncate">{current.note}</span>
            {many && (
              <span className="flex shrink-0 items-center gap-1">
                <CaptionArrow
                  side="left"
                  label="上一張"
                  disabled={index === 0}
                  onClick={() => step(-1)}
                />
                <span className="tabular-nums">
                  {index + 1} / {images.length}
                </span>
                <CaptionArrow
                  side="right"
                  label="下一張"
                  disabled={index === images.length - 1}
                  onClick={() => step(1)}
                />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Same lightbox shape as the table-of-contents viewer: a transparent
          panel over a dim overlay, and a click anywhere off the image closes
          it. */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent
          showCloseButton={false}
          className="flex h-screen w-screen max-w-none items-center justify-center border-0 bg-black/[0.64] p-0 shadow-none sm:max-w-none"
          onClick={() => setIsZoomed(false)}
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <button
            type="button"
            aria-label="關閉"
            className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
            onClick={() => setIsZoomed(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- the
                lightbox sizes itself to the viewport, which next/image cannot
                express without fixed dimensions or a positioned parent. */}
            <img
              src={current.url}
              alt={alt}
              className="max-h-[94vh] w-auto max-w-[94vw] object-contain"
            />
            {(many || current.note) && (
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/60 px-4 py-2 text-white">
                {many && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="上一張"
                    className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
                    disabled={index === 0}
                    onClick={() => step(-1)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}
                <span className="max-w-[60vw] truncate text-sm">
                  {current.note}
                  {many &&
                    `${current.note ? "　" : ""}${index + 1} / ${images.length}`}
                </span>
                {many && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="下一張"
                    className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
                    disabled={index === images.length - 1}
                    onClick={() => step(1)}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function GalleryArrow({
  side,
  label,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`absolute top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm transition-opacity hover:text-foreground disabled:pointer-events-none disabled:opacity-0 ${
        side === "left" ? "left-1" : "right-1"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/* The caption row's arrows. Unlike the pair over the image, a disabled one
   stays visible at low contrast: the row is a fixed set of controls, and
   having one vanish at either end of the run makes the counter jump. */
function CaptionArrow({
  side,
  label,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-5 w-5 items-center justify-center rounded transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
