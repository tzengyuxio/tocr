import { FileQuestion } from "lucide-react";

/**
 * 「找不到」的共用版面。
 *
 * 三個 `not-found.tsx` 共用這一份：站台根目錄（網址完全對不上時）、公開頁與後台各
 * 一份（`notFound()` 從那一層丟出來時，才會連著各自的外框一起渲染）。
 *
 * 文字要留在呼叫端：後台編輯知道自己在後台，前台讀者不必知道有後台這回事。
 */
export function NotFoundNotice({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  /** 出口。這頁的重點是「怎麼離開」，不是「你走錯了」。 */
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <FileQuestion className="h-12 w-12 text-muted-foreground/50" />
      <p className="mt-6 text-sm font-medium tracking-widest text-muted-foreground">
        404
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {children}
      </div>
    </div>
  );
}
