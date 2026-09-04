"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * 刊期連結，滑鼠停留時浮出封面。
 *
 * 用 Popover 而不是純 CSS 的 group-hover，是因為表格的容器是 `overflow-x-auto`
 * ——CSS 規範裡 `overflow-x` 一旦不是 `visible`，`overflow-y: visible` 就會被算
 * 成 `auto`，浮在儲存格外的東西會被裁掉，還會多長一條捲軸。Popover 走 Portal，
 * 掛在 body 上，不受這個容器管。
 *
 * 沒有封面就退回一個普通連結，連 client 元件都不掛：站上還有大量期數沒有掃描，
 * 那時什麼都不該浮出來。觸控裝置沒有 hover，行為也就是一個連結。
 */
export function IssueCoverHover({
  href,
  coverImage,
  alt,
  children,
}: {
  href: string;
  coverImage: string | null;
  alt: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!coverImage) {
    return (
      <Link href={href} className="hover:underline">
        {children}
      </Link>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Link
          href={href}
          className="hover:underline"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {children}
        </Link>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        className="pointer-events-none w-auto p-1"
        // 這是滑過去看一眼的東西，不是要操作的面板：開啟時把焦點搶走，鍵盤使用
        // 者會被丟出原本的位置。
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <Image
          src={coverImage}
          alt={alt}
          width={160}
          height={224}
          unoptimized
          className="h-auto w-40 rounded bg-muted"
        />
      </PopoverContent>
    </Popover>
  );
}
