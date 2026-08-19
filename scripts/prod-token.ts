import { execFileSync } from "node:child_process";

/**
 * 從 macOS Keychain 取出打正式站用的 Bearer token。
 *
 * 憑證刻意不落地成檔案：`.env.local` 會被 dev server 載入，而 repo 裡的檔案
 * 讀得到的東西不只有人——token 一旦成為檔案就可能被 grep 出來、貼進對話、
 * 留在某段輸出裡。腳本在執行當下才取，用完就隨程序結束。
 *
 * 預設是 yuxio 個人的 per-user token：寫入等同他本人操作，`edit_logs` 署他的名，
 * 撤銷也只是他在 /admin/profile 按一下。共用的 `tocr-prod-api-token` 仍然有效，
 * 但它一律掛給司書(NPC)，而且要撤銷得改 Vercel 環境變數再 redeploy，所以留作備用
 * ——需要時把 service name 傳進來。
 *
 * 存放方式見 docs/deployment.md。
 */
const DEFAULT_SERVICE = "tocr-prod-token-claude";

export function productionToken(service: string = DEFAULT_SERVICE): string {
  return execFileSync("security", [
    "find-generic-password", "-s", service, "-a", process.env.USER ?? "", "-w",
  ]).toString().trim();
}
