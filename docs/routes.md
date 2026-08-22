# 路由與 API

## 前台頁面

| 路徑 | 說明 |
|---|---|
| `/` | 首頁：搜尋框、統計、最新單期 |
| `/magazines` | 雜誌列表。可切卡片／列表檢視（`?view=list`），另有篩選與排序參數 |
| `/magazines/[slug]` | 雜誌詳情與單期列表。網址吃 ASCII slug（`/magazines/ace`），舊的 cuid 連結永久轉址 |
| `/magazines/[slug]/issues/[issueSlug]` | 單期目錄。兩段都吃 slug；單期那段也收期號與舊 cuid，皆永久轉址 |
| `/i/[code]` | 單期永久短碼，307 轉到當下的正規網址。`Issue.code` 是自動產生的 8 碼，正規網址的每一段都可能變，這條不會 |
| `/games` | 遊戲列表 |
| `/games/[slug]` | 該遊戲的相關文章。網址吃 slug（可為中文），舊的 cuid 連結永久轉址 |
| `/tags` | 標籤索引 |
| `/tags/[slug]` | 該標籤的相關文章。網址吃 slug（可為中文），舊的 cuid 連結永久轉址 |
| `/contributors` | 貢獻者 |
| `/search` | 搜尋（`?type=article\|magazine\|game`） |

## 給機器讀的路徑

| 路徑 | 說明 |
|---|---|
| `/sitemap.xml` | 全站網址，資料庫動態產生，1 小時重算。短碼 `/i/[code]` 刻意不收——同一份內容不報兩個位址 |
| `/robots.txt` | 擋 `/admin`、`/api`、`/auth`（都是必定拿不到內容的路徑）。**AI 爬蟲一律放行，那是決定不是預設值**，理由寫在 `src/app/robots.ts` 的註解 |
| `/llms.txt` | 站台給模型看的導覽：這裡有什麼、怎麼定址、讀什麼、什麼算可信、收錄哪些雜誌。動態產生（刊物與期數每次匯入都在變），與 sitemap 同樣 1 小時重算 |

## 認證頁面

| 路徑 | 說明 |
|---|---|
| `/auth/signin` | 登入 |
| `/auth/error` | 登入失敗 |
| `/auth/unauthorized` | 權限不足 |

## 後台頁面

需要 EDITOR 以上。

| 路徑 | 說明 |
|---|---|
| `/admin` | 儀表板 |
| `/admin/magazines` | 雜誌管理 |
| `/admin/magazines/new` | 新增雜誌 |
| `/admin/magazines/import` | CSV 批次匯入 |
| `/admin/magazines/[id]` | 雜誌詳情（三欄佈局） |
| `/admin/magazines/[id]/issues/new` | 新增單期 |
| `/admin/magazines/[id]/issues/[issueId]` | 單期詳情與文章管理 |
| `/admin/issues` | 待複查清單（目錄尚未經人工確認的單期） |
| `/admin/articles` | 文章管理 |
| `/admin/articles/new` | 新增文章 |
| `/admin/articles/[id]` | 文章編輯 |
| `/admin/ocr` | AI 目錄辨識（上傳與辨識，結果直接寫入該期文章）|
| `/admin/tags` · `/admin/tags/[id]` | 標籤管理與詳情 |
| `/admin/games` · `/admin/games/[id]` | 遊戲管理與詳情 |
| `/admin/contributors` | 貢獻排行與近期活動 |
| `/admin/export` | CSV 匯出 |
| `/admin/users` | 使用者管理（僅 ADMIN） |
| `/admin/edit-logs` | 編輯紀錄（僅 ADMIN） |
| `/admin/export-logs` | 匯出紀錄（僅 ADMIN） |
| `/admin/profile` | 個人設定（顯示名稱） |

## API

授權集中在 `src/middleware.ts`，不在各個 handler 裡：**所有寫入方法**（POST／PUT／PATCH／DELETE）需要 EDITOR 以上，`/api/export` 是唯一同樣受保護的讀取。其餘 GET 公開。

例外是四支會花錢或寫檔的路由——`/api/ocr`、`/api/upload`、`/api/import/magazines-issues`、`/api/games/search-cover`（燒 RAWG 配額）——它們另外用 `requireEditor()`（`src/lib/require-editor.ts`）自己再檢查一次。規則與 middleware 相同（API token 或 EDITOR／ADMIN session），目的是讓 middleware 一旦被繞過（Next.js 出過 CVE-2025-29927）不會直接換來一次模型帳單。

`API_TOKEN` 與貢獻者自己的 per-user token（`/admin/profile` 產生，`tocr_` 開頭）都可代替 session 用於寫入，但不適用於 `/api/users` 與 `/api/tokens`，也不適用於任何讀取。per-user token 每次都要查一次資料庫確認沒被撤銷、且持有人仍是 EDITOR 以上，所以 middleware 先比對前綴，不是我們的字串就不去打資料庫。

### 期刊 / 單期 / 文章

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET · POST | `/api/magazines` | 列表 / 新增 |
| GET · PUT · DELETE | `/api/magazines/[id]` | 單筆 CRUD |
| GET · POST | `/api/issues` | 列表 / 新增 |
| GET · PUT · DELETE | `/api/issues/[id]` | 單筆 CRUD |
| PUT | `/api/issues/reorder` | 批次排序 |
| GET | `/api/issues/[id]/ocr` | 該期最近一次成功的辨識結果 |
| GET · POST | `/api/articles` | 列表 / 新增 |
| POST | `/api/articles/batch` | 批次建立 |
| GET · PUT · DELETE | `/api/articles/[id]` | 單筆 CRUD |
| PUT | `/api/articles/reorder` | 批次排序 |

分頁參數 `page` 與 `limit` 會被夾在合理範圍內，`limit` 上限 100。

### 標籤 / 遊戲

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET · POST | `/api/tags` | 列表 / 新增 |
| GET · PUT · DELETE | `/api/tags/[id]` | 單筆 CRUD |
| GET · POST | `/api/games` | 列表 / 新增 |
| GET · PUT · DELETE | `/api/games/[id]` | 單筆 CRUD |
| POST | `/api/games/search-cover` | 用 RAWG 搜尋遊戲封面 |

### 使用者與貢獻者

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/users` | 使用者列表 |
| GET · PUT | `/api/users/[id]` | 詳情 / 更新角色（ADMIN，且不能改自己的角色） |
| PATCH | `/api/users/me` | 修改自己的顯示名稱（不看 id，所以只能改自己；系統帳號拒絕） |
| GET · POST | `/api/tokens` | 自己的 API token 清單 / 產生一支（明碼只在這個回應裡出現一次） |
| DELETE | `/api/tokens/[id]` | 撤銷自己的 token（標記 `revokedAt`，不刪列） |
| GET | `/api/contributors` | 貢獻排行 |
| GET | `/api/contributors/[id]` | 單一貢獻者 |

### 其他

| 方法 | 路徑 | 說明 |
|---|---|---|
| POST | `/api/ocr` | 執行辨識，單次上限 10 張圖 |
| GET | `/api/ocr` | 可用的 Provider 列表 |
| POST | `/api/upload` | 圖片上傳（自動縮圖轉檔，見 [features.md](features.md#檔案儲存)） |
| POST | `/api/import/magazines-issues` | CSV 批次匯入 |
| GET | `/api/export` | 匯出 CSV（串流，需登入） |
