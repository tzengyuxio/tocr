# TOCR — 期刊目錄索引系統

把老遊戲雜誌的目錄頁變成可以搜尋的索引：上傳掃描圖，用視覺模型擷取出文章清單，人工複查後入庫，再依標籤與遊戲交叉瀏覽。站名取自 **T**able **o**f **C**ontents 與 **OCR**。

正式站：<https://tocr.simagame.me>

## 現況

正式站的資料量（2026-09-12）：

| | 數量 | 備註 |
|---|---|---|
| 雜誌 | 52 本、66 個刊名 | 改過名的刊一個時期一列 |
| 單期 | 2,691 期 | 其中 1,337 期有封面（49.7%） |
| 文章 | 11,922 篇，分佈在 269 期 | 佔全部單期的一成，其餘只有書目資料 |
| 遊戲 | 6,138 款 | 10,028 條「文章↔遊戲」關聯 |
| 標籤 | 1,050 個 | |

目錄辨識已在正式站運作：上傳目錄頁 → 視覺模型辨識 → 匯入建檔 → 對照掃描圖逐條複查。匯入後的單期預設是「尚未複查」，後台會標示出來；模型的輸出在複查之前只是初稿，不當作定稿。

## 技術棧

| 類別 | 技術 |
|---|---|
| 框架 | Next.js 16（App Router）、React 19 |
| 語言 | TypeScript（strict） |
| 資料庫 | PostgreSQL 15+ / Neon |
| ORM | Prisma 7 |
| 認證 | Auth.js v5 + Google OAuth |
| AI | Claude / OpenAI 相容 / Gemini 的視覺 API |
| 儲存 | Vercel Blob，本地 fallback |
| UI | Tailwind CSS 4 + shadcn/ui + Radix UI |
| 表單 | react-hook-form + Zod |
| 測試 | Jest + Testing Library |
| 部署 | Vercel（主要）／ Docker |

## 快速開始

需要 Node.js 20+、pnpm、以及一個 PostgreSQL 15+。

```bash
pnpm install

# 環境變數：範本裡每個變數都有說明
cp .env.example .env.local

# 本機資料庫（可選，也可以用你自己的 PostgreSQL）
docker compose -f docker-compose.dev.yml up -d   # podman compose 亦可

# 套用 migration
pnpm exec prisma migrate dev

pnpm dev
```

前往 http://localhost:3000。

> Schema 變更請一律走 migration。`prisma db push` 會讓 migration 歷史與實際結構脫節，這個專案已經為此補過一次基準線。

沒設定 Google OAuth 也想先看後台的話，在 `.env.local` 設 `DEV_BYPASS_AUTH="true"`（該旗標在 production 一律無效）。

## 環境變數

全部變數與說明都在 [`.env.example`](.env.example)。最少需要 `DATABASE_URL`、`AUTH_SECRET`，以及至少一組 AI 服務金鑰才能使用辨識功能。

## 開發指令

```bash
pnpm dev            # 開發伺服器
pnpm build          # 建置
pnpm start          # 啟動 production
pnpm lint           # ESLint
pnpm test           # Jest
pnpm test:watch     # Jest（監聽）
pnpm test:coverage  # 覆蓋率
pnpm exec tsc --noEmit   # 型別檢查
pnpm exec prisma studio  # 資料庫 GUI
```

每個 PR 都會跑 ESLint、`tsc --noEmit` 與 Jest（`.github/workflows/ci.yml`）。

## 測試

單元測試涵蓋所有 Zod validator、工具函式與 CSV 匯入匯出邏輯，API 路由以 Prisma mock 測試。

```bash
pnpm test
```

## 文件

| 文件 | 內容 |
|---|---|
| [功能](docs/features.md) | 各項功能的實際行為與限制 |
| [路由與 API](docs/routes.md) | 頁面與 API 端點、授權規則 |
| [架構](docs/architecture.md) | 目錄結構、資料模型、授權模型、部署形態 |
| [資料慣例](docs/data-conventions.md) | 建檔時的判斷準則 |
| [介面慣例](docs/ui-conventions.md) | Chip 的配色與圖示等畫面規範 |
| [Vercel 部署](docs/deployment.md) | 正式環境部署 |
| [Docker 部署](docs/docker-deployment.md) | 自架伺服器 |
| [本地開發](docs/local-development.md) | 開發環境細節 |

待辦事項記在 [BACKLOG.md](BACKLOG.md)，一項一行；需要考證或要寫設計的移到
[`docs/backlog/`](docs/backlog/)，做完的封存進 [`docs/backlog/done.md`](docs/backlog/done.md)。
確定要做的會開成 GitHub issue。

## 資料

`data/` 放的是建檔時拿來比對的外部資料，不是站台執行時會讀的東西。

| 檔案 | 內容 |
|---|---|
| [`data/magazines.json`](data/magazines.json) | 雜誌基本資料，上游是 nostalibrary 的 `content/magazines/` |
| [`data/collectors-note.txt`](data/collectors-note.txt) | 一位收藏家的「全期數已收齊」清單，21 本刊的創刊、休刊、期名與本數。用來比對站上還缺哪些刊——它記的是**收齊的**，不是收藏的全部 |
| [`data/famitsu-game-index.csv`](data/famitsu-game-index.csv) | 《電玩通》封底裡「遊戲索引」的逐列轉錄，欄位 `issue, platform_printed, platform_tag, name, pages` |

### `data/famitsu-game-index.csv`

《電玩通》每期封底裡印一張「電玩通週刊VOL N遊戲索引」，把全期出現過的遊戲依平台分列、
附頁碼，頁上並註明譯名「均為編輯部參考各式相關資料後研討做成」——**那是編輯部自己統一
過的譯名表**，所以拿它當 `Game.name` 與 `PLATFORM` 標籤的基準，而不是拿目錄頁的報導標題
（同一款在標題裡常帶宣傳語或簡稱，掛上去就會長出一堆寫法不一的遊戲）。

- `platform_printed` 是索引上印的欄頭，原樣保留——同一個平台在不同期印法不一
  （`PlayStation2` 與 `PLAYSTATION3`、`WiiU` 與 `Wii U`）
- `platform_tag` 是對應到站上 `PLATFORM` 標籤的那個名字，一個平台一個值
- `pages` 一列多個頁碼時用 `;` 接（索引上印的是 `32、66`）
- `name` **照索引印的登錄**，包含 `（暫定）` 這類未定譯名與未翻譯的日文原名
  （VOL.438 的「超速変形ジャイロゼッター アルバロスの翼」）。要不要剝掉 `（暫定）`
  是建 `Game` 時的判斷，不在這份轉錄裡先做掉

轉錄自 `~/Pictures/covers/raw/magazines/famitsu-tw/famitsu-tw_<期>_c3.jpg`（封底裡掃描），
目前有 VOL.181／184／185／193／412／438 六期，全部人工讀圖轉錄。

要加新的一期，用 [`scripts/read-game-index.ts`](scripts/read-game-index.ts) 起草：

```bash
npx tsx --env-file=.env.local scripts/read-game-index.ts <c3.jpg> <期號>
```

它直接打 `OPENAI_BASE_URL` 那個端點，**不走 `/api/ocr`**——那條路是拿目錄頁餵
`TOC_EXTRACTION_PROMPT`，索引頁送進去會被當成目錄、每一列生出一篇假文章（VOL.181
生了 62 篇），見 [BACKLOG.md](BACKLOG.md)。

**起草完仍要對圖。** 索引是平鋪清單，比目錄頁可靠，但不是零錯：VOL.184 的 38 列有
2 列錯字（`荒野雙蛟龍`→`雙姣龍`、`神秘樂園`→`神秘秘樂園`）。而**這一欄的用途正是當
譯名的正本**，錯字放進去等於用它去污染 `Game.name`。`platform_tag` 腳本一律留空，
由人決定對應到哪個 `PLATFORM` 標籤——新平台第一次出現時本來就要決定叫什麼。

## 授權

MIT License
