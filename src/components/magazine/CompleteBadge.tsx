import { Badge } from "@/components/ui/badge";

/**
 * 「完備」標記。**只有 ADMIN 看得到，呼叫端自己負責不要 render 給別人**——
 * 這個元件不查權限，它只認得三種狀態。
 *
 * 沒標示過就什麼都不畫：一整排「未完備」等於把每一列都變成待辦事項，而多數
 * 期數本來就還沒輪到。這一點跟同一列的「未複查」不同，那是流程狀態，看得到
 * 進度才有意義。
 */
export function CompleteBadge({
  issue,
}: {
  issue: { completeAt: Date | string | null; completeStaleAt: Date | string | null };
}) {
  // 三態全在這兩欄裡：沒標過、標了沒被動過、標了又被動過。判讀留在這裡而不是
  // 抽成共用函式，是因為這個檔會被 client component 載進去，而寫入那半個
  // （lib/issue-complete.ts）牽著 prisma——那不能跟進瀏覽器。
  if (!issue.completeAt) return null;

  if (!issue.completeStaleAt) {
    return <Badge title="資料完備，不必再回頭看">完備</Badge>;
  }
  return (
    <Badge variant="outline" title="標為完備之後資料又被改過，需要重新確認">
      完備・已變更
    </Badge>
  );
}
