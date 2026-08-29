# TOCR — 期刊目錄索引系統

把老遊戲雜誌的目錄頁變成可以搜尋的索引：上傳掃描圖，用視覺模型擷取出文章清單，人工複查後入庫，再依標籤與遊戲交叉瀏覽。

## 現況

已建檔 42 本雜誌，其中 32 本有單期資料，共 2268 期。

文章目錄尚未開始正式匯入：資料模型與複查流程還在收斂，等確認之後才會在正式站上傳目錄頁進行辨識。目前的 OCR 與複查都在開發環境驗證。

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

## 授權

MIT License
