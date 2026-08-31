import { Badge } from "@/components/ui/badge";

/**
 * 「已校訂」——公開頁上的那個小框。
 *
 * 不寫「完備」：那是編輯之間的話（這一期不必再回頭看），讀者不在乎流程。也不寫
 * 「完整」：這個站只有封面與目錄頁，讀者會把它讀成「整本都掃了」。「已校訂」講
 * 的是資料被人核對過，不承諾內容量。
 *
 * 二態，不是後台那三態：核對過就標，其餘一律不標。「完備・已變更」是內部待辦，
 * 讀者看到只會困惑；沒有標記也不需要解釋——沒標不代表有錯。三態的那一個在
 * components/magazine/CompleteBadge.tsx，只給後台用。
 */
export function VerifiedMark({ verified }: { verified: boolean }) {
  if (!verified) return null;

  return (
    <Badge
      variant="outline"
      className="px-1.5 py-0 text-[10px] font-normal tracking-wider text-muted-foreground"
      title="這一期的資料經管理員核對過"
    >
      已校訂
    </Badge>
  );
}
