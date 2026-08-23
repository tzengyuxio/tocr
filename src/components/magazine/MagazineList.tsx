import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  MAGAZINE_CATEGORY_CHIPS,
  type MagazineDisplayUnit,
} from "@/lib/magazine-browse";
import { cn } from "@/lib/utils";

/**
 * `/magazines` 的列表檢視，卡片牆之外的另一種讀法。
 *
 * 列的單位是顯示單位而不是 Magazine：有刊名沿革的雜誌一時期一列，發行期間
 * 與期數在 magazineDisplayUnits 算好帶進來——同一套推導餵兩種檢視，這裡只管排版。
 *
 * 沒有用 `<Table>`：那個元件是 `"use client"`，而這一頁整條都是伺服器算好的，
 * 為了畫幾條線把 34 列送去 hydrate 不划算。行動裝置上表格也擠不下五欄，橫向
 * 捲軸讀一份索引很難用。所以是 flex 排的列，窄螢幕只留刊名與期數，欄位隨寬度
 * 逐段出現。
 *
 * 與後台的 `MagazineListClient` 刻意不共用：那邊有編輯、快速新增單期、建立日期，
 * 都是編輯才需要的東西；這邊要的是發行期間與分類。共用會變成一個到處都是
 * `isAdmin` 判斷的元件。
 */
export function MagazineList({ units }: { units: MagazineDisplayUnit[] }) {
  return (
    <div className="divide-y rounded-lg border">
      {units.map((unit) => (
        <Link
          key={unit.key}
          href={unit.href}
          className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
        >
          {/* 與後台同一個橫幅框：標準字是寬扁的（華泰任天堂秘笈 812x281），
              直立的框會裁掉刊名只剩中間一條。 */}
          {unit.logoImage ? (
            <Image
              src={unit.logoImage}
              alt={unit.name}
              width={224}
              height={80}
              unoptimized
              className="h-10 w-28 shrink-0 rounded object-contain"
            />
          ) : (
            <div className="flex h-10 w-28 shrink-0 items-center justify-center rounded bg-muted">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">
              {unit.name}
              {unit.previousTitle && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  （原 {unit.previousTitle}）
                </span>
              )}
            </div>
            {unit.nameParallel && (
              <div className="truncate text-sm text-muted-foreground">
                {unit.nameParallel}
              </div>
            )}
          </div>

          <div className="hidden w-40 shrink-0 truncate text-sm text-muted-foreground md:block">
            {unit.publisher || "出版社不詳"}
          </div>

          {/* 有起有訖的期間拆成兩行（起訖各一行），一行擠不下就不硬擠；
              只有起點的「X創刊」「X起」維持一行。分隔符是 spanLabel 組的
              " – "，這裡照它拆。 */}
          <div className="hidden w-44 shrink-0 text-sm text-muted-foreground lg:block">
            {unit.span.includes(" – ") ? (
              <>
                <div className="truncate">{unit.span.split(" – ")[0]} –</div>
                <div className="truncate">{unit.span.split(" – ")[1]}</div>
              </>
            ) : (
              <div className="truncate">{unit.span}</div>
            )}
          </div>

          {/* 固定寬度：這欄夾在兩個固定欄之間，寬度隨 chip 數量伸縮的話，
              左邊的出版社與期間會被推得各列不對齊（電玩宅速配兩顆 chip 就
              露了餡）。縮寫版 w-36 放得下全部三顆；未來加了 Mobile 之後的
              四顆換行。 */}
          <div className="hidden w-36 shrink-0 flex-wrap gap-1 xl:flex">
            {unit.categories.map((category) => (
              <Badge
                key={category}
                className={cn(
                  "border-0 text-xs font-normal",
                  MAGAZINE_CATEGORY_CHIPS[category].className
                )}
              >
                {MAGAZINE_CATEGORY_CHIPS[category].label}
              </Badge>
            ))}
          </div>

          {/* tabular-nums 讓期數的位數對齊，一整欄才掃得出誰收得多。 */}
          <div className="w-16 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
            {unit.issueCount} 期
          </div>
        </Link>
      ))}
    </div>
  );
}
