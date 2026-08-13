# Backlog

想到但還沒要做的事。隨手記，不排優先序；要動工時再評估。
格式：`- [ ] [#issue] 標題 — 一句說明（日期）`（完成就打勾或刪除）。
這份檔是正本，GitHub issue 是鏡像——決定要做的項目才開 issue，編號回填到行首。

- [ ] [#33] **辨識信心度可能是無效訊號** — `confidence` 是模型自評。原本 UI 依它上色（≥90% 綠、≥70% 黃），但電腦玩家 105 期那 61 筆**全部都是 1.0**，等於永遠綠燈——比沒有訊號更糟，因為它讀起來像「已檢查、沒問題」。**色彩編碼已拿掉，數值保留**。剩下的決定是：多收幾期看它是否一直滿分，然後要嘛整個移除，要嘛換成比較實在的訊號（頁碼不連續、標題過短、缺頁碼）。另注意 `ocr.utils.ts` 在模型沒回這欄時補 `0.8`，所以 80% 不代表模型沒把握（2026-08-12，2026-08-13 更新）
- [ ] [#35] **`pg-connection-string` 的 SSL mode 警告** — 線上 log 有這則：`prefer`/`require`/`verify-ca` 之後會被當成 `verify-full`，pg-connection-string v3.0.0 / pg v9.0.0 起是 breaking change。目前不影響，升級前要處理（2026-08-12）
- [ ] [#34] **純數字期號加上「第 N 期」** — 549 期裡 544 期的 `issueNumber` 是純數字，單獨顯示「216」讀起來不像期號。建議抽 `formatIssueNumber()` 放在 `formatEdtf` 旁邊：純數字才加「第 N 期」，`創刊號`、`試刊號`、`70+71` 這類原樣保留。不要只改一處——`issueNumber` 散落在 32 個檔案，只改單期複查會讓同一期在不同頁面長得不一樣。不用 `Vol.`／`No.`：前者會跟另一個獨立欄位 `volumeNumber` 混淆，後者偏西式。

  **但先不要動手**：目前看到的特殊刊號（`創刊號`、`試刊號`、`創刊驚嘆號`、`70+71`）只來自 3 本雜誌，而已匯入 30 本、還有 27 本沒進來。等更多期刊的刊號樣貌浮現，再一次決定規則會更完整——現在定案等於用不到十分之一的樣本立規矩（2026-08-13）

- [ ] **正式站的 `ANTHROPIC_API_KEY` 認證不過** — 錯誤是 `Could not resolve authentication method. Expected either apiKey or authToken to be set`，代表 SDK 拿到空值，不是 key 打錯。變數在 Vercel 上存在（Sensitive），可能存成空字串，或是設定後沒 redeploy（這專案踩過：環境變數在部署建立當下才固定）。要嘛重設後 redeploy，要嘛從 production 移除，讓 `getAvailableProviders()` 誠實回報 claude 不可用。**Provider 預設值那半邊已修**（2026-08-13，PR #51）（2026-08-13）
- [ ] **編輯記錄是 fire-and-forget，在 serverless 上可能靜默丟失** — `logEdit` / `logEditBatch` 都沒有 await 那個 insert（`ready.then(...).catch(console.error)`），回應送出後 pending promise 在 Vercel 上可能被凍結。目前觀察到的寫入都有成功，但這個形狀的失敗完全無聲：2026-08-13 在本機就發生過一次（dev server 持有 migration 前的 Prisma client，3 篇文章建出來了、edit log 一列都沒寫，沒有任何跡象）。要嘛改成 await，要嘛用 `waitUntil`（2026-08-13）

## 2026-08-13 code review 待辦

以下來自一次完整的 code review。已修的部分不在此列（`DEV_BYPASS_AUTH` 的 production 護欄、`parsePagination` 的 clamp、contributors 的 eslint error、prisma mock 的 tsc errors、信心度色彩編碼）。

- [ ] [#26] **匯入腳本沒有進版控，每次都要重寫** — 已匯入 30 本、還有 27 本沒進來，而每次要用都得重寫一次。等資料面的決定收斂、開始在 production 上傳目錄頁時，這支腳本會被反覆使用，屆時「上次是怎麼跑的」會變成實際問題（2026-08-13）
- [ ] [#27] **授權只有 middleware 一層** — 18 個 route handler 自己完全不檢查身分，全靠 `src/middleware.ts` 擋。集中在一處本身合理，但 Next.js middleware 出過 header 偽造的 bypass（CVE-2025-29927，16.1.6 已修），「唯一防線」這個形狀仍然脆弱。建議抽 `requireEditor(request)`，至少在會花錢或寫檔的 `/api/upload`、`/api/ocr`、`/api/import` 補第二層（2026-08-13）
- [ ] [#28] **`/api/export` 匿名可打，而且一次載入整個資料庫** — middleware 只擋寫入，所以這支 GET 沒有任何驗證；query 是 magazines → issues → articles → tags + games 全展開、無分頁。現在資料空的所以沒事，549 期 × 每期數十篇進來之後必然 OOM 或 timeout。**趁資料還空的時候決定要不要串流／分批**（2026-08-13）
- [ ] [#29] **匯出的 CSV 有 formula injection** — `export/route.ts` 的 `escapeCsvField` 處理了引號與逗號，沒處理 `=` `+` `-` `@` 開頭。文章標題直接來自 OCR，而匯出檔的用途就是給 Excel 開。前綴補一個單引號即可（2026-08-13）
- [ ] [#30] **`/api/ocr` 把上游錯誤原樣吐出** — 500 的 response 帶 `details: error.message`，自架 Qwen 後端的錯誤訊息（含內部 URL）會外流給呼叫端。log 保留、response 換成通用訊息（2026-08-13）
- [ ] [#31] **OCR 的 rate limit 在 Vercel 上形同虛設** — `rate-limit.ts` 是 in-memory Map，每個 lambda 實例各數各的。檔頭有誠實說明，但 `ocr/route.ts` 的註解寫「10 requests per minute per user/IP」，讀的人會以為有保護。另外 `images` 陣列沒有張數上限，一次送 50 張就是 50 張的模型帳單。至少補張數上限並改掉那句註解（2026-08-13）
- [ ] [#32] **`isSafeImageUrl` 的信任錨點來自 Host header** — `origin` 是呼叫端用 `new URL(request.url).origin` 算出來傳進去的，same-origin 分支等於「凡是 Host 說了算」，把 allowlist 的意義稀釋掉。實際利用需要能偽造 Host 且已通過 editor 驗證，風險不高，但應該改成用設定的正式網域（2026-08-13）
- [ ] [#36] **清掉 34 個 eslint warning** — 其中 12 個是 `format` / `zhTW` 的 unused import，散在 6 個檔案，是改掉日期顯示邏輯後留下的 orphan；其餘多為 `<img>` vs `next/image`（2026-08-13）
- [ ] [#37] **`.gitignore` 最後一行 `.env*` 與上面的 env 區塊重複** — 且語意上涵蓋了已 tracked 的 `.env.example`。不影響行為，但矛盾（2026-08-13）
- [ ] [#38] **`upload/route.ts` 的檔名亂數可能是空字串** — `Math.random().toString(36).substring(7)` 在隨機字串本身不夠長時回傳 `""`。timestamp 大致擋住碰撞，但這寫法是誤用（2026-08-13）
- [ ] [#39] **三個檔案超過 650 行** — `OcrResultEditor.tsx` 749、`admin/games/page.tsx` 668、`ArticleForm.tsx` 666。不急，但下次動到它們時順手拆（2026-08-13）
