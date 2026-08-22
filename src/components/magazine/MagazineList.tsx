import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  MAGAZINE_CATEGORY_LABELS,
  type MagazineDisplayUnit,
} from "@/lib/magazine-browse";

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
            <div className="truncate font-medium">{unit.name}</div>
            {unit.nameOriginal && (
              <div className="truncate text-sm text-muted-foreground">
                {unit.nameOriginal}
              </div>
            )}
          </div>

          <div className="hidden w-40 shrink-0 truncate text-sm text-muted-foreground md:block">
            {unit.publisher || "出版社不詳"}
          </div>

          <div className="hidden w-56 shrink-0 truncate text-sm text-muted-foreground lg:block">
            {unit.span}
          </div>

          <div className="hidden shrink-0 gap-1 xl:flex">
            {unit.categories.map((category) => (
              <Badge key={category} variant="outline" className="text-xs font-normal">
                {MAGAZINE_CATEGORY_LABELS[category]}
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
