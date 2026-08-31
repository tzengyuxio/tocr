# 架構

## 目錄結構

```
tocr/
├── prisma/
│   ├── schema.prisma           # 資料庫 schema
│   └── migrations/             # migration 歷史
├── src/
│   ├── middleware.ts           # 授權集中在這裡
│   ├── app/
│   │   ├── (admin)/admin/      # 後台
│   │   ├── (public)/           # 前台
│   │   ├── auth/               # 登入相關頁面
│   │   └── api/                # API 路由
│   ├── components/
│   │   ├── ui/                 # shadcn/ui
│   │   ├── magazine/ article/ ocr/ import/ layout/
│   ├── lib/
│   │   ├── auth.ts             # Auth.js 設定
│   │   ├── api-token.ts        # 批次寫入用的 Bearer token
│   │   ├── api-utils.ts        # 錯誤處理、分頁
│   │   ├── prisma.ts
│   │   ├── edtf.ts             # EDTF 日期解析與顯示
│   │   ├── image-optimize.ts   # 上傳的縮圖與轉檔政策
│   │   ├── edit-log*.ts        # 編輯紀錄的寫入、diff、標題解析
│   │   ├── csv/                # CSV 匯入解析、匯出組列與跳脫
│   │   └── validators/         # Zod schema
│   └── services/ai/            # OCR
│       ├── ocr.interface.ts
│       ├── ocr.factory.ts
│       ├── prompts/
│       └── providers/          # claude / openai / gemini
├── src/__tests__/              # Jest
├── docs/
└── .github/workflows/ci.yml
```

## 資料模型

### 核心實體

| 實體 | 說明 |
|---|---|
| `Magazine` | 期刊：名稱、原文名、別名、出版社、ISSN、創刊／停刊日期、刊頭 |
| `Issue` | 單期：期號、其他編號、永久短碼、卷號、出版日期、封面、目錄頁掃描圖、複查時間 |
| `Photo` | 額外圖片：掛雜誌或掛單期（二擇一），帶說明、來源與公開與否 |
| `Article` | 文章：標題、副標題、作者、頁碼、分類、摘要 |
| `Tag` | 標籤：六種類型 |
| `Game` | 遊戲：原文名、英文名、別名、平台、開發商、發行商、類型 |
| `OcrRecord` | 辨識紀錄：原始結果、Provider、狀態 |
| `EditLog` | 編輯紀錄：使用者、動作、對象、diff、是不是走 API token 寫的 |
| `ApiToken` | 貢獻者的寫入憑證：只存 sha256，可撤銷 |
| `User` | 使用者與角色，Auth.js 的 `Account` / `Session` 隨附 |

### 關聯

```
Magazine 1:N Issue 1:N Article
Article  N:N Tag   (ArticleTag)
Article  N:N Game  (ArticleGame)
Issue    1:N OcrRecord
User     1:N EditLog
User     1:N ApiToken
```

### 幾個刻意的設計

**日期存 EDTF 字串，另存一個排序欄位。** 期刊與單期常常只知道年或月，EDTF（ISO 8601-2）能表達「1994」「1999-05」「1994-22（季）」而不必虛構日期。EDTF 字串無法直接排序，所以寫入時同時算出 `foundedSort` / `publishSort` 供排序用。

`Issue.publishDate` 與 `publishSort` 都可為空，而且一起空——有些期數什麼日期都沒印。**一本刊之內的順序看 `Issue.order`**（匯入時取來源自己的序列，`PUT /api/issues/reorder` 重排），日期只在跨刊清單（搜尋、標籤、遊戲）當時間軸用，沒有日期的排在最後。

**ISSN 不設唯一性。** 改名可以沿用同一組 ISSN，《電擊王》與《電玩通》就共用 1561-8099。

**文章分類是 enum，不是自由字串。** 中文標籤放在 `src/lib/article-categories.ts`，改字不需要資料 migration——這個欄位的名稱被改過兩次。該清單刻意不從 `@prisma/client` 匯入（那是伺服器執行期，而表單元件是 `"use client"`），改以一個測試斷言它與 enum 一致。

**搜尋用 trigram 索引。** 標題、副標題、摘要與期刊名都建了 `gin_trgm_ops` 索引供 ILIKE 搜尋。

更多建檔準則見 [data-conventions.md](data-conventions.md)。

## 授權模型

集中在 `src/middleware.ts`，各個 route handler 不自行檢查。

| 對象 | 要求 |
|---|---|
| `/admin/**` | 登入且為 EDITOR 或 ADMIN |
| `/admin/users`、`/admin/edit-logs` | ADMIN |
| `/api/**` 的寫入方法 | EDITOR 或 ADMIN，或有效的 `API_TOKEN`，或某位 EDITOR／ADMIN 的 per-user token |
| `/api/users`、`/api/tokens` | 只接受 session，不接受任何 token |
| `/api/export` | 登入且為 EDITOR 或 ADMIN，不接受 token |
| 其餘 `/api/**` 的 GET | 公開 |

`DEV_BYPASS_AUTH=true` 會跳過全部檢查，但只在非 production 生效。

## 部署形態

生產環境在 Vercel，資料庫是 Neon。

**Function region 釘在 `sin1`**（`vercel.json`）。先前 function 在 `iad1`、資料庫在新加坡，跨太平洋往返讓後台每頁要 1.8–2.8 秒；同區之後暖機 13–50ms。

**`prisma migrate deploy` 跑在 build 裡**，production 與 preview 都跑。2026-08-17 起 preview 有自己的 Neon branch，所以這件事是安全的；在那之前兩者共用同一個資料庫，build script 得擋住 preview。詳見 [deployment.md](deployment.md)——**preview branch 由所有 PR 共用，會累積漂移**。

另有 Docker 部署路徑，見 [docker-deployment.md](docker-deployment.md)。
