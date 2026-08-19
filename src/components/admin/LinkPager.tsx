import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * 後台清單的分頁列，狀態在網址上的那一種（/admin/issues、/admin/edit-logs、
 * /admin/export-logs）。三頁本來各有一份一模一樣的實作。
 *
 * 與 ListPager 的分工見那支的註解：這裡換頁是 Link，那裡是 useState。措辭
 * （「第 X / Y 頁」）與置中的擺法刻意一致。
 */
export function LinkPager({
  page,
  totalPages,
  pageHref,
}: {
  page: number;
  totalPages: number;
  pageHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <PagerButton href={pageHref(page - 1)} disabled={page <= 1}>
          上一頁
        </PagerButton>
        <PagerButton href={pageHref(page + 1)} disabled={page >= totalPages}>
          下一頁
        </PagerButton>
      </div>
      <p className="text-sm text-muted-foreground">
        第 {page} / {totalPages} 頁
      </p>
    </div>
  );
}

/** 到頭的那一端沒有網址可去，所以停用的鍵不包 Link。 */
function PagerButton({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <Button variant="outline" size="sm" disabled>
        {children}
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={href}>{children}</Link>
    </Button>
  );
}
