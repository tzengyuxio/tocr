"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * The parts every lightbox on the site shares: the arrows over the image and
 * the keys that do the same thing without them.
 *
 * The counter and caption stay with each lightbox -- what a picture is called
 * differs between a masthead, a scanned index and a cover -- but paging
 * through them should not.
 */

/**
 * Left and right arrow keys, while `active`.
 *
 * The handler is held in a ref so a caller can pass an inline arrow function
 * without resubscribing on every render.
 */
export function useLightboxKeys(active: boolean, onStep: (by: number) => void) {
  const stepRef = useRef(onStep);
  useEffect(() => {
    stepRef.current = onStep;
  });

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") stepRef.current(-1);
      else if (event.key === "ArrowRight") stepRef.current(1);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);
}

/**
 * One of the pair flanking the enlarged image. Big, because the reader is
 * looking at the picture, not at the pill of controls under it -- and at the
 * edge of the screen, which is where a pointer can reach without aiming.
 *
 * A disabled arrow stays in place at low contrast rather than vanishing: the
 * image is centred, so a missing arrow would not shift anything, but a pair
 * that keeps its shape reads as the run having an end.
 *
 * It belongs beside the close button, at the edge of the dialog rather than
 * the edge of the picture: a tall cover is a narrow box, and arrows pinned to
 * it would sit on top of the scan. Hence the stopPropagation -- a click
 * anywhere off the image closes the lightbox, and paging is not closing.
 */
export function LightboxArrow({
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
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 disabled:pointer-events-none disabled:opacity-25 ${
        side === "left" ? "left-4" : "right-4"
      }`}
    >
      <Icon className="h-7 w-7" />
    </button>
  );
}
