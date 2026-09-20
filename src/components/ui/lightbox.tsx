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

/**
 * 按住圖片拖著看。
 *
 * 一張比框大的圖（原尺寸的掃描、放大的封面）本來就有捲軸，但看著它的人第一個
 * 動作是抓住它拖。掛在**捲動的那一層**上，位移直接改 `scrollLeft/Top`。
 *
 * `didPan()` 給「點旁邊就關」的燈箱用：拖到一半放開手，那是拖不是點，不該關掉。
 */
export function useImagePan() {
  const ref = useRef<HTMLDivElement>(null);
  const from = useRef<{ x: number; y: number; left: number; top: number } | null>(
    null
  );
  const moved = useRef(false);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    moved.current = false;
    // 觸控與筆不接手：手指本來就能捲，插進來只會跟原生的慣性捲動打架。
    if (!el || event.pointerType !== "mouse" || event.button !== 0) return;
    if (el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight) {
      return;
    }
    from.current = {
      x: event.clientX,
      y: event.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
    };
    el.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    const start = from.current;
    if (!el || !start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    // 幾像素的手震不算拖曳，不然按一下就關不掉了。
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved.current = true;
    // 拖的是圖不是捲軸，所以位移是反過來的：往左拖＝往右看。
    el.scrollLeft = start.left - dx;
    el.scrollTop = start.top - dy;
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!from.current) return;
    from.current = null;
    ref.current?.releasePointerCapture(event.pointerId);
  };

  return {
    ref,
    /** 攤在捲動的那一層上。 */
    panProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
    /** 剛放開的那一下是拖曳，不是點擊。 */
    didPan: () => moved.current,
  };
}
