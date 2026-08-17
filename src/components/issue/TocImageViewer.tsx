"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * The scan being checked against, beside whatever list is doing the checking.
 * The caller owns the column width; this starts at the sticky block.
 */
export function TocImageViewer({ images }: { images: string[] }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  if (images.length === 0) return null;

  return (
    <>
      {/* A sticky block taller than its scrollport can never reach its own
          bottom, which used to hide the foot of the scan until the article
          list ran out. The scrollport is the admin <main>: the viewport less
          its 3.5rem header, less main's padding at both ends, less this
          block's own top offset. */}
      <div className="sticky top-4 flex max-h-[calc(100vh-8rem)] flex-col gap-3">
        {/* The cap lives on the image, in viewport units. A percentage height
            -- h-full or max-h-full -- resolves against a flex-derived height
            that is not definite, so the scan overflowed and got clipped rather
            than scaled: the viewport less the header, main's padding, the
            sticky offset and the controls below. */}
        <div className="flex min-h-0 justify-center overflow-hidden rounded-lg border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element -- the height
              is a viewport calculation; next/image would need fixed dimensions
              or fill, and this is admin-only. */}
          <img
            src={images[currentImageIndex]}
            alt={`目錄頁 ${currentImageIndex + 1}`}
            className="max-h-[calc(100vh-11rem)] w-auto max-w-full cursor-pointer object-contain"
            onClick={() => setIsZoomed(true)}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {images.length > 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                aria-label="上一頁"
                disabled={currentImageIndex === 0}
                onClick={() => setCurrentImageIndex((i) => i - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentImageIndex + 1} / {images.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                aria-label="下一頁"
                disabled={currentImageIndex === images.length - 1}
                onClick={() => setCurrentImageIndex((i) => i + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setIsZoomed(true)}
          >
            <Maximize2 className="mr-2 h-4 w-4" />
            全螢幕檢視
          </Button>
        </div>
      </div>

      {/* A lightbox, not a panel: the content is transparent so the dim overlay
          shows the page behind, and a click anywhere off the image closes it. */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent
          showCloseButton={false}
          className="flex h-screen w-screen max-w-none items-center justify-center border-0 bg-black/[0.64] p-0 shadow-none sm:max-w-none"
          onClick={() => setIsZoomed(false)}
        >
          <DialogTitle className="sr-only">
            目錄頁 {currentImageIndex + 1} / {images.length}
          </DialogTitle>
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
                lightbox sizes itself to the viewport; see the note above. */}
            <img
              src={images[currentImageIndex]}
              alt={`目錄頁 ${currentImageIndex + 1}`}
              className="max-h-[94vh] w-auto max-w-[94vw] object-contain"
            />
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 rounded-full bg-black/60 px-4 py-2 text-white">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="上一頁"
                  className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
                  disabled={currentImageIndex === 0}
                  onClick={() => setCurrentImageIndex((i) => i - 1)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-sm">
                  {currentImageIndex + 1} / {images.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="下一頁"
                  className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
                  disabled={currentImageIndex === images.length - 1}
                  onClick={() => setCurrentImageIndex((i) => i + 1)}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
