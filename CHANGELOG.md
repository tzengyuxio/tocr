# 更新日誌

本專案所有值得記錄的變更都寫在這個檔案。

格式依循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，
版本編號依循 [語意化版本](https://semver.org/lang/zh-TW/)。

## [未發布]

## [0.3.0] - 2026-08-13

這一版的重心是把 OCR 之後的**人工複查流程**補完，讓一期的目錄有明確的「誰確認過、什麼時候確認的」，並修掉一批安全性與效能問題。

### 新增

- **單期複查流程**——單期新增 `tocReviewedAt`，記錄是否有人確認過目錄；`/admin/issues` 列出尚未複查的單期。人工批次儲存文章時才會標記，**透過 API token 的寫入不標記**，因為無人值守的流程不能宣稱有人檢查過
- **複查頁自動載入辨識結果**——`ocr_records` 先前是只寫不讀的表，辨識結果存了卻沒有任何介面讀得回來。新增 `GET /api/issues/[id]/ocr` 取最新一筆，複查時不必重跑模型
- **編輯紀錄瀏覽介面**——`/admin/edit-logs` 供 ADMIN 依使用者、類型、動作篩選；紀錄同時保存變更前後的值，並解析出每筆紀錄指向的對象名稱
- **貢獻者頁**——前後台各一，顯示貢獻排行與近期活動
- **EDTF 日期**——期刊的創刊／停刊日與單期的出版日改存 EDTF（ISO 8601-2），可以表達「1994」「1999-05」「1994-22」這種只知道年、月或季的情況，不必虛構日期。另存 `foundedSort` / `publishSort` 供排序
- **批次寫入用的 API token**——腳本可用 Bearer token 認證寫入，紀錄歸屬於「司書(NPC)」帳號。token 不能用於使用者管理
- **支援 OpenAI 相容端點**——設定 `OPENAI_BASE_URL` 即可指向自架的模型服務，並可讓推理型模型跳過思考鏈
- **搜尋擴及期刊與遊戲**，首頁改以搜尋為主
- **上傳自動縮圖與轉檔**——顯示用圖縮到長邊 1600 並轉 WebP；目錄頁掃描圖縮到 2400 並**維持 JPEG**
- **CSV 匯出**改為串流輸出，單期以 50 筆為一批讀取
- **持續整合**——每個 PR 跑 ESLint、`tsc --noEmit` 與 Jest
- **效能量測**——`PERF_LOG` 可開關的伺服器端計時，用來定位後台延遲
- 目錄圖示的 favicon、`BACKLOG.md`、以及雜誌匯入的資料慣例文件

### 變更

- **文章分類改為 Prisma enum**——原本是自由字串，同一個分類名被改過兩次，每次都要寫資料 migration。中文標籤現在放在 `src/lib/article-categories.ts`，改字不動資料。分類詞彙也統一成單字詞
- **辨識信心度不再上色**——原本依信心度標綠／黃／紅，但收集到的樣本全是滿分，等於永遠綠燈，讀起來像「已檢查、沒問題」而其實沒有。改為只顯示數值
- **OCR 複查介面多次調整**——欄位改用雜誌實際的說法命名、掃描圖完整可見、列動作不再佔掉一整條空白、標籤顯示其類型、長清單可操作
- **README 依現況重寫**，參考資料拆成 `docs/features.md`、`docs/routes.md`、`docs/architecture.md`
- Prisma Client 改在 install 時生成

### 修正

- **後台每頁 1.8–2.8 秒的延遲**——函式在 `iad1`、資料庫在新加坡，每次請求都跨太平洋往返。將函式區域釘在 `sin1` 後，暖機後為 13–50ms
- **首頁「最新單期」會撈到空殼期數**——既無封面也無文章的單期看起來像壞掉，現已濾除
- **部分更新會把有預設值的欄位重設**——PATCH 只帶部分欄位時，未帶到的欄位被寫回預設值
- **空白的表單欄位被存成空字串**而非 null
- **移除期刊 ISSN 的唯一性限制**——改名可以沿用同一組 ISSN，《電擊王》與《電玩通》就共用 1561-8099
- **目錄頁掃描圖不再轉 WebP**——自架的模型後端解不開 WebP，會回 500
- **分頁參數加上邊界**——`?page=abc` 會以 NaN 進到 Prisma 並回 500，`limit` 則沒有上限，一個請求就能要求整張表
- **匯出的「沒有單期的雜誌」少一欄**——該列只有 19 欄而表頭是 20 欄，嚴格的 CSV parser 會報錯或整列錯位
- OCR 路由的執行時間上限設為 60 秒；trgm 索引的 migration 移除 `CONCURRENTLY`；Prisma schema 補上 SQL migration 已建立的索引；後台回前台的入口不再有歧義
- 清掉一個長期存在的 ESLint error 與三個 tsc error，使兩者都能作為關卡

### 安全性

- **`DEV_BYPASS_AUTH` 在 production 一律無效**——這個旗標會跳過 middleware 的所有檢查，而那是唯一一層授權；Vercel 的環境變數凍結在部署當下，誤設要 redeploy 才收得回來
- **CSV 匯出的 formula injection**——文章標題直接來自 OCR，而匯出檔就是要給 Excel 開，以 `=` `+` `-` `@` 開頭的欄位會被當成公式執行
- **匯出需要登入**——middleware 原本只擋寫入，這支一個請求回傳整份目錄的端點任何人都打得到
- **OCR 不再回傳上游錯誤訊息**——自架模型後端的錯誤可能含內部 URL 與組態
- **OCR 單次請求限制 10 張圖**——原本收多少送多少，一次 50 張就是 50 張的模型帳單

## [0.2.0] - 2026-04-01

### 新增

- **編輯稽核軌跡**——所有寫入 API 都留下 `EditLog`
- **貢獻者追蹤與排行**
- **全文搜尋**——加上 `pg_trgm` 索引並擴大搜尋範圍
- **文章列表 inline 編輯**與批次建立
- **CSV 匯出**
- **遊戲封面**（RAWG 搜尋帶入）、遊戲列表分頁、智慧標籤建議、inline 新增
- 後台各頁的返回按鈕、OCR 進度指示

### 變更

- 介面用詞由「期數」改為「單期」
- 前台的 `<img>` 改用 `next/image`
- 抽出共用的 `StatGrid` 元件與 `withErrorHandler`，消除各路由重複的 try/catch
- 以 ISR 取代 `force-dynamic`，並將首頁查詢並行化
- 改善 OCR prompt，抽出共用的解析邏輯
- 前後台大幅的 UX 調整：間距、卡片、響應式格線、後台側欄（行動裝置抽屜、640px 以上常駐）

### 修正

- **OCR 圖片抓取的 SSRF 防護**——僅允許同源與白名單的儲存網域
- **OCR API 加上速率限制**
- `@prisma/client` 從 devDependencies 移到 dependencies

### 測試

- 以 Prisma mock 新增 API 路由的整合測試

## [0.1.0] - 2026-02-13

第一個可用的版本。

### 新增

- **專案基礎**——Next.js 16 App Router、TypeScript、Prisma、PostgreSQL
- **期刊與單期 CRUD**，期刊詳情頁三欄佈局、可搜尋下拉選單
- **單期拖曳排序**——@dnd-kit，樂觀更新並在失敗時回滾
- **AI 目錄辨識**——Claude Vision API 起家，以策略模式與工廠模式支援 Claude / OpenAI / Gemini 三種 Provider，並依環境變數動態偵測可用服務
- **多圖辨識**——一期可有多張目錄頁，OCR 頁自動帶入已上傳的圖片
- **雙欄複查編輯器**——左側圖片預覽、右側文章列表 inline 編輯
- **文章編輯**——個別編輯與批次建立
- **標籤與遊戲**——標籤六種類型，兩者的詳情頁都依期刊、單期分組顯示相關文章，可展開收合
- **前台頁面**——首頁、搜尋、期刊／遊戲／標籤瀏覽
- **認證與權限**——Google OAuth 登入，VIEWER／EDITOR／ADMIN 三種角色，首位使用者自動成為 ADMIN
- **開發模式免登入**——`DEV_BYPASS_AUTH=true`
- **CSV 批次匯入**期刊與單期
- **本地檔案儲存 fallback**——沒有 Blob token 時寫入 `public/`
- **單元測試**——涵蓋所有 validator 與工具函式
- **部署支援**——Dockerfile、docker-compose.yml、Vercel 部署文件

### 修正

- OCR 路由的相對圖片 URL 解析
- 上傳的 placeholder token 判斷
- `SelectItem` 空字串值造成的執行期錯誤

[未發布]: https://github.com/tzengyuxio/tocr/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/tzengyuxio/tocr/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/tzengyuxio/tocr/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/tzengyuxio/tocr/releases/tag/v0.1.0
