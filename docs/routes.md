# 路由與 API

## 前台頁面

| 路徑 | 說明 |
|---|---|
| `/` | 首頁：搜尋框、統計、最新單期 |
| `/magazines` | 期刊列表 |
| `/magazines/[id]` | 期刊詳情與單期列表 |
| `/magazines/[id]/issues/[issueId]` | 單期目錄 |
| `/games` | 遊戲列表 |
| `/games/[id]` | 該遊戲的相關文章 |
| `/tags` | 標籤索引 |
| `/tags/[id]` | 該標籤的相關文章 |
| `/contributors` | 貢獻者 |
| `/search` | 搜尋（`?type=article\|magazine\|game`） |

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
| `/admin/magazines` | 期刊管理 |
| `/admin/magazines/new` | 新增期刊 |
| `/admin/magazines/import` | CSV 批次匯入 |
| `/admin/magazines/[id]` | 期刊詳情（三欄佈局） |
| `/admin/magazines/[id]/issues/new` | 新增單期 |
| `/admin/magazines/[id]/issues/[issueId]` | 單期詳情與文章管理 |
| `/admin/issues` | 待複查清單（目錄尚未經人工確認的單期） |
| `/admin/articles` | 文章管理 |
| `/admin/articles/new` | 新增文章 |
| `/admin/articles/[id]` | 文章編輯 |
| `/admin/ocr` | AI 目錄辨識與複查 |
| `/admin/tags` · `/admin/tags/[id]` | 標籤管理與詳情 |
| `/admin/games` · `/admin/games/[id]` | 遊戲管理與詳情 |
| `/admin/contributors` | 貢獻排行與近期活動 |
| `/admin/export` | CSV 匯出 |
| `/admin/users` | 使用者管理（僅 ADMIN） |
| `/admin/edit-logs` | 編輯紀錄（僅 ADMIN） |
| `/admin/profile` | 個人設定（顯示名稱） |

## API

授權集中在 `src/middleware.ts`，不在各個 handler 裡：**所有寫入方法**（POST／PUT／PATCH／DELETE）需要 EDITOR 以上，`/api/export` 是唯一同樣受保護的讀取。其餘 GET 公開。

例外是四支會花錢或寫檔的路由——`/api/ocr`、`/api/upload`、`/api/import/magazines-issues`、`/api/games/search-cover`（燒 RAWG 配額）——它們另外用 `requireEditor()`（`src/lib/require-editor.ts`）自己再檢查一次。規則與 middleware 相同（API token 或 EDITOR／ADMIN session），目的是讓 middleware 一旦被繞過（Next.js 出過 CVE-2025-29927）不會直接換來一次模型帳單。

`API_TOKEN` 可代替 session 用於寫入，但不適用於 `/api/users`，也不適用於任何讀取。

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
