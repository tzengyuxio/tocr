# Backlog

想到但還沒要做的事。隨手記，不排優先序；要動工時再評估。
格式：`- [ ] [#issue] 標題 — 一句說明（日期）`（完成就打勾或刪除）。
這份檔是正本，GitHub issue 是鏡像——決定要做的項目才開 issue，編號回填到行首。

- [ ] [#33] **辨識信心度可能是無效訊號** — `confidence` 是模型自評。原本 UI 依它上色（≥90% 綠、≥70% 黃），但電腦玩家 105 期那 61 筆**全部都是 1.0**，等於永遠綠燈——比沒有訊號更糟，因為它讀起來像「已檢查、沒問題」。**色彩編碼已拿掉，數值保留**。剩下的決定是：多收幾期看它是否一直滿分，然後要嘛整個移除，要嘛換成比較實在的訊號（頁碼不連續、標題過短、缺頁碼）。另注意 `ocr.utils.ts` 在模型沒回這欄時補 `0.8`，所以 80% 不代表模型沒把握（2026-08-12，2026-08-13 更新）
- [ ] **多頁目錄改成逐張辨識再合併成一筆記錄** — 目前 `/api/ocr` 把所有圖一次送給模型，一次呼叫存一筆 `ocr_records`。兩張圖沒問題（101 期 79 篇、105 期 59 篇，比對原圖幾乎無缺），**三張就開始成段掉東西**：114 期漏 9 筆、錯 4 處，而且漏的集中在後半段（96–110 與 300–354），像是輸出預算用完後草草收尾。

  不能只是「呼叫端自己拆成三次」——每次呼叫存一筆記錄，而複查頁只讀最新一筆，拆了只會留下最後一張的結果。要改的是路由：逐張辨識、合併 `articles`（依 `pageStart` 排序）、寫成**一筆**記錄。順帶要想的是 `maxDuration = 60`（Vercel Hobby 上限）：三張序列跑很可能超時，可能得平行送或改成非同步。

  **優先度不高**：目錄頁大多是兩頁，現況足夠；但四頁的期刊會出現，屆時必須先有這個（2026-08-14）
- [ ] **遊戲頁的文章列表：加封面、把期刊與單期併成一欄** — `/games/[id]` 列出這款遊戲出現過的所有文章，目的是「找到那本雜誌」，但列表全是文字，認不出是哪一本。

  兩件事：

  1. **顯示封面**。可以直接放縮圖，或維持現有列表、hover 才浮出封面。`Issue.coverImage` 欄位已經有，但這頁的 query 沒 select 它，要補。**封面覆蓋率不是 100%**（正式站電腦玩家前 100 期裡有 60 期有封面），所以缺圖的 fallback 要一起想。另外 hover 版本需要把列表拆成 client component——目前整頁是 server component
  2. **期刊與單期併成一欄**。注意：單期連結**其實已經有**（「單期」欄連到 `/magazines/[id]/issues/[id]`），幫助不大的是「期刊」欄那個連到 `/magazines/[id]` 的連結。所以要做的是把兩欄併成一個指向單期的欄位，而不是「補上單期連結」。`/admin/issues` 那頁已經是這個形狀（`電腦玩家雜誌 96`，整列連到單期），可以沿用

  桌機是 `<Table>`、手機是卡片列表，**兩處都要改**（2026-08-14）
- [ ] **「從 RAWG 抓取」的實作檢查** — 2026-08-14 讀了一遍，四個問題，其中「使用者看不到錯誤」已修（`handleFetchCover` 補上非 2xx 分支），剩下三個：

  1. **正式站根本沒有 `RAWG_API_KEY`**（`vercel env ls production` 查證），所以那顆按鈕在線上一律回 500 `RAWG API key not configured`——現在至少看得到這句話了
  2. **抓到的網址直接存進 `coverImage`**，那是 `api.rawg.io` 的遠端 URL，而 `next.config.ts` 的 `remotePatterns` 只允許 `*.public.blob.vercel-storage.com`——用 `next/image` 顯示會被擋。要嘛把圖抓下來丟 Blob（跟封面既有慣例一致），要嘛把 rawg 加進 allowlist
  3. **`page_size=1` 直接取第一筆**，沒有確認步驟。中文遊戲名（《軒轅劍3》這類）在 RAWG 的英文資料庫幾乎不會命中，第一筆很可能是不相干的遊戲。另外取的欄位是 `background_image`，那是 RAWG 的美術圖／截圖，不是盒裝封面

  順帶一提，這個功能對這個專案的意義要先想清楚：這裡的「封面」是要給雜誌索引用的辨識圖，跟 RAWG 的遊戲宣傳圖不是同一種東西（2026-08-14）
- [ ] **沒有實際變更的儲存不該留下編輯記錄** — 正式站 2026-08-14 00:58 有一筆 Game UPDATE，六個欄位全是 `null → ""`（`nameEn`、`nameOriginal`、`developer`、`publisher`、`description`、`coverImage`）。

  **根因不是「記錄了 no-op」，而是那次儲存真的寫入了東西**：表單把沒填的選填欄位送成空字串，於是資料庫裡的 NULL 被改成 `""`，`diffChanges` 忠實地報告了這個變化。所以每個遊戲第一次被打開儲存，都會平白改寫六個欄位。

  兩層要修：

  1. **資料面**：選填文字欄位在寫入前把 `""` 正規化成 `null`（validator 或 route 皆可），否則同一個「沒有值」在資料庫裡有兩種表示
  2. **記錄面**：`diffChanges` 算完若是空物件，就整筆不要寫。UPDATE 路由都已經在用它了，補一個「空的就 return」即可

  3. **顯示面**：`edit-logs/page.tsx` 的 `formatValue` 把 `null`、`undefined`、`""` 全都印成「（空）」，所以那六行讀起來是 `nameEn ~~（空）~~ → （空）`——看起來像什麼都沒改。即使前兩層修好，舊記錄仍然長這樣。至少讓兩端 render 結果相同的欄位不要列出來；要保留資訊的話就把 `null` 與 `""` 分開顯示（例如「（未設定）」與「（空字串）」）

  至於「只顯示有變更的欄位」——`diffChanges` **已經只存有變更的欄位**（`edit-log-diff.ts`），上面那筆之所以列出六個，是因為那六個在資料庫層面真的被改了。讀起來像沒改，是因為顯示把兩種「空」混成同一個詞（2026-08-14）
- [ ] **單期頁的目錄列表要更緊湊** — `/magazines/[id]/issues/[issueId]` 的文章列表現在是六欄 `<Table>`（頁碼／標題／作者／分類／相關遊戲／編輯），一期 50–80 篇時整頁拉得很長，一眼看不到全貌。而目錄的用途本來就是掃視。

  可能的方向（都還沒決定）：縮小行距與 padding、把作者與分類收進標題那一欄的次要行、遊戲標籤改成只在 hover／展開時顯示、或整個換成多欄排版（原始雜誌目錄本來就是兩欄）。手機版是另一套卡片列表，要一起想。

  **動手前先討論版面規劃**（yuxio 2026-08-14 明確要求）——這是設計決定，不是照著改就好（2026-08-14）
- [ ] **與 nostalib / cdosgame 兩站的資料連動** — 目標是讓 `tocr.simagame.me`、`nostalib.simagame.me`（懷舊圖書館）、`cdosgame.simagame.me`（中文 DOS 遊戲資料庫）三邊的資料互相關聯。

  最直接的接點是**遊戲**：TOCR 的 `Game` 與 cdosgame 的條目、以及雜誌書目與 nostalibrary 的館藏（見 [[nostalibrary-data-sources]] 的來源比較）。但關聯要怎麼建立（外部 id 欄位？slug 對照表？單向連結或雙向？）沒有討論過。

  **等資料量多了再討論**（yuxio 2026-08-14）。現在 TOCR 正式站只有 4 期有目錄、遊戲條目多半是 OCR 產生的暫時資料，此時定對照規則會用太小的樣本立規矩——與 [#34] 期號格式押後的理由相同（2026-08-14）
- [ ] **update schema 的 `.partial()` 保留了 default，部分更新會覆寫既有值** — `.partial()` 只讓欄位變成選填、不會拿掉 `.default()`，所以沒帶該欄位的 PUT 會把資料庫裡的值改寫成 default。

  **2026-08-14 實測撞到，不是假設**：對 `/api/articles/[id]` 送一個只帶 `gameIds` 的 PUT，那篇文章的 `sortOrder` 被從 19 重設成 0（`articleCreateSchema` 的 `sortOrder` 有 `.default(0)`），目錄順序當場亂掉。同樣形狀的還有 `gameUpdateSchema` 的 `platforms` / `genres`（`.default([])` → 清成空陣列）。

  `magazine.ts` 已經踩過並在註解寫明修法（`.extend()` 把 default 拿掉），`issue.ts` 對 `tocImages` 也做了。後台表單每次送完整欄位所以看不出來，用 API 做部分更新才會。要逐個 update schema 檢查有 `.default()` 的欄位（2026-08-14）
- [ ] [#35] **`pg-connection-string` 的 SSL mode 警告** — 線上 log 有這則：`prefer`/`require`/`verify-ca` 之後會被當成 `verify-full`，pg-connection-string v3.0.0 / pg v9.0.0 起是 breaking change。目前不影響，升級前要處理（2026-08-12）
- [ ] [#34] **純數字期號加上「第 N 期」** — 549 期裡 544 期的 `issueNumber` 是純數字，單獨顯示「216」讀起來不像期號。建議抽 `formatIssueNumber()` 放在 `formatEdtf` 旁邊：純數字才加「第 N 期」，`創刊號`、`試刊號`、`70+71` 這類原樣保留。不要只改一處——`issueNumber` 散落在 32 個檔案，只改單期複查會讓同一期在不同頁面長得不一樣。不用 `Vol.`／`No.`：前者會跟另一個獨立欄位 `volumeNumber` 混淆，後者偏西式。

  **但先不要動手**：目前看到的特殊刊號（`創刊號`、`試刊號`、`創刊驚嘆號`、`70+71`）只來自 3 本雜誌，而已匯入 30 本、還有 27 本沒進來。等更多期刊的刊號樣貌浮現，再一次決定規則會更完整——現在定案等於用不到十分之一的樣本立規矩（2026-08-13）

## 2026-08-13 code review 待辦

以下來自一次完整的 code review。已修的部分不在此列（`DEV_BYPASS_AUTH` 的 production 護欄、`parsePagination` 的 clamp、contributors 的 eslint error、prisma mock 的 tsc errors、信心度色彩編碼）。

- [ ] [#26] **匯入腳本沒有進版控，每次都要重寫** — 已匯入 30 本、還有 27 本沒進來，而每次要用都得重寫一次。等資料面的決定收斂、開始在 production 上傳目錄頁時，這支腳本會被反覆使用，屆時「上次是怎麼跑的」會變成實際問題。動手時順帶決定三件事：放 `scripts/`、資料來源怎麼取（Google Sheet 是正本）、以及用 API token 還是直接連 DB（2026-08-13）
- [ ] [#27] **授權只有 middleware 一層** — 18 個 route handler 自己完全不檢查身分，全靠 `src/middleware.ts` 擋。集中在一處本身合理，但 Next.js middleware 出過 header 偽造的 bypass（CVE-2025-29927，16.1.6 已修），「唯一防線」這個形狀仍然脆弱。建議抽 `requireEditor(request)`，至少在會花錢或寫檔的 `/api/upload`、`/api/ocr`、`/api/import` 補第二層（2026-08-13）
- [ ] [#32] **`isSafeImageUrl` 的信任錨點來自 Host header** — `origin` 是呼叫端用 `new URL(request.url).origin` 算出來傳進去的，same-origin 分支等於「凡是 Host 說了算」，把 allowlist 的意義稀釋掉。實際利用需要能偽造 Host 且已通過 editor 驗證，風險不高，但應該改成用設定的正式網域（2026-08-13）
- [ ] [#39] **三個檔案超過 650 行** — `src/components/ocr/OcrResultEditor.tsx` 746、`src/app/(admin)/admin/games/page.tsx` 671、`src/components/article/ArticleForm.tsx` 666。不急，也不建議為了拆而拆；列著是為了下次動到它們時順手處理，不是排一個專門的重構（2026-08-14 覆核行數）
