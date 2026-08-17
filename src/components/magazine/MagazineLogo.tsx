"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * The masthead, beside the magazine's details rather than in a strip above
 * them, and clickable for a full-size look.
 *
 * A button rather than a div with onClick: the logo is the only way to open
 * the lightbox, so it has to be reachable by keyboard.
 *
 * Most magazines have no masthead on file, so the caller may pass the earliest
 * issue's cover instead; `note` is what keeps a reader from reading a cover as
 * a masthead.
 */
export function MagazineLogo({
  src,
  name,
  note,
}: {
  src: string;
  name: string;
  /** Says what the picture is when it is not the masthead -- see the page. */
  note?: string;
}) {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <div className="flex w-full shrink-0 flex-col gap-1 self-stretch md:w-80 lg:w-[26rem]">
      {/* self-stretch is what makes the logo as tall as the details beside it:
          the row's height comes from the text column, and the flex item then
          matches it. min-h keeps it from collapsing when the details are only
          a line or two -- and on mobile, where the row is a column and there
          is no sibling height to match.

          The column is wide because a masthead is wide: 軟體世界's is 681x206,
          so width, not height, is what limits it. Matching the details column's
          height alone made the logo *smaller* than the 80px-tall strip this
          replaced -- 26rem is what actually enlarges it. */}
      <button
        type="button"
        aria-label={`放大檢視 ${name} 的刊頭`}
        onClick={() => setIsZoomed(true)}
        className="relative min-h-40 w-full flex-1 cursor-zoom-in overflow-hidden rounded-lg bg-muted/30 transition-colors hover:bg-muted/60"
      >
        {/* fill, not fixed dimensions: the box is sized by the row beside it,
            and object-contain keeps a wide masthead from being cropped. */}
        <Image
          src={src}
          alt={name}
          fill
          unoptimized
          sizes="(min-width: 1024px) 26rem, (min-width: 768px) 20rem, 100vw"
          className="object-contain p-3"
        />
      </button>

      {note && <p className="text-xs text-muted-foreground">{note}</p>}

      {/* Same lightbox shape as the table-of-contents viewer: a transparent
          panel over a dim overlay, and a click anywhere off the image closes
          it. */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent
          showCloseButton={false}
          className="flex h-screen w-screen max-w-none items-center justify-center border-0 bg-black/[0.64] p-0 shadow-none sm:max-w-none"
          onClick={() => setIsZoomed(false)}
        >
          <DialogTitle className="sr-only">{note ?? `${name} 的刊頭`}</DialogTitle>
          <button
            type="button"
            aria-label="關閉"
            className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
            onClick={() => setIsZoomed(false)}
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- the lightbox
              sizes itself to the viewport, which next/image cannot express
              without fixed dimensions or a positioned parent. */}
          <img
            src={src}
            alt={name}
            className="max-h-[94vh] w-auto max-w-[94vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
