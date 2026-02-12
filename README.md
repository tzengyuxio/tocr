# TOCR - 期刊目錄索引系統

遊戲雜誌目錄索引網站，支援 AI 圖片辨識自動擷取目錄、多人協作編輯、標籤系統。

## 功能特色

### 期刊管理

- 期刊 CRUD（名稱、出版社、ISSN、創刊/停刊日期、封面）
- 期數管理（期號、卷號、出版日期、封面、目錄頁掃描圖）
- **期數拖曳排序**（@dnd-kit，拖曳調整順序，批次儲存）
- **快速新增期數**（Dialog 模式，不需跳頁）
- **CSV 批次匯入**（一次匯入多本期刊與期數資料）
- 期刊詳情頁三欄佈局（期刊資訊 / 快速新增 / 期數列表）

### AI 目錄辨識 (OCR)

- 上傳目錄頁圖片，AI 自動辨識並擷取結構化資料
- **支援多圖上傳**（一本期數可有多張目錄頁掃描圖）
- 自動帶入期數已上傳的目錄頁圖片
- **三大 AI Provider**：Claude (Anthropic)、OpenAI (GPT-4o)、Gemini (Google AI)
- 動態偵測可用的 AI 服務（依環境變數自動判斷）
- **雙欄編輯器**：左側目錄圖片預覽（支援切換/放大）、右側文章列表 inline 編輯
- 辨識結果一鍵批次儲存至資料庫

### 文章索引

- 文章標題、副標題、作者、頁碼、分類等完整目錄資訊
- 文章個別編輯與批次建立
- 關聯標籤與遊戲（多對多）

### 標籤系統

- 支援 6 種標籤類型：一般、人物、活動、系列、公司、平台
- **標籤詳情頁**：依期刊、期數分組顯示相關文章
- 可展開/收合的樹狀瀏覽

### 遊戲索引

- 遊戲作為特殊實體（平台、開發商、發行商、類型、封面）
- **遊戲詳情頁**：依期刊、期數分組顯示相關文章
- 與文章多對多關聯，支援標記「主要遊戲」

### 前台瀏覽

- 首頁儀表板（統計數據、最新期數、最近更新、熱門遊戲）
- 期刊/期數/文章瀏覽
- 遊戲與標籤索引頁
- 全文搜尋

### 認證與權限

- Auth.js v5 + Google OAuth 2.0 登入
- 三種角色：Viewer（瀏覽）/ Editor（編輯）/ Admin（管理）
- 首位使用者自動成為 Admin
- 開發模式免登入繞過（`DEV_BYPASS_AUTH=true`）

### 檔案儲存

- 生產環境：Vercel Blob
- 開發環境：本地檔案系統 fallback

## 技術棧

| 類別 | 技術 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 語言 | TypeScript (strict mode) |
| 資料庫 | PostgreSQL 15+ |
| ORM | Prisma 7 |
| 認證 | Auth.js v5 + Google OAuth |
| AI | Claude / OpenAI / Gemini Vision APIs |
| 儲存 | Vercel Blob / Local Filesystem |
| UI | Tailwind CSS 4 + shadcn/ui + Radix UI |
| 拖曳 | @dnd-kit |
| 表單 | react-hook-form + Zod |
| CSV | PapaParse |
| 測試 | Jest |
| 部署 | Vercel / Docker |

## 快速開始

### 環境需求

- Node.js 20+
- PostgreSQL 15+
- pnpm

### 安裝步驟

```bash
# 1. 複製專案
git clone <repository-url>
cd tocr

# 2. 安裝依賴
pnpm install

# 3. 設定環境變數
cp .env.example .env.local
# 編輯 .env.local 填入必要的環境變數

# 4. 初始化資料庫
npx prisma generate
npx prisma db push

# 5. 啟動開發伺服器
pnpm dev
```

前往 http://localhost:3000

## 環境變數

建立 `.env.local` 檔案，設定以下變數：

```env
# 資料庫
DATABASE_URL="postgresql://user:password@localhost:5432/tocr"

# Auth.js
AUTH_SECRET="your-auth-secret-at-least-32-characters"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# 自動設為 ADMIN 的 email（選擇性）
# ADMIN_EMAILS="admin@example.com"

# AI 服務（至少設定一個）
DEFAULT_OCR_PROVIDER="claude"
ANTHROPIC_API_KEY="sk-ant-..."
# OPENAI_API_KEY="sk-..."
# GOOGLE_AI_API_KEY="..."

# Vercel Blob 儲存（生產環境）
BLOB_READ_WRITE_TOKEN="vercel_blob_..."

# 開發模式免登入（選擇性）
# DEV_BYPASS_AUTH="true"
```

## 專案結構

```
tocr/
├── prisma/
│   └── schema.prisma          # 資料庫 schema
├── src/
│   ├── app/
│   │   ├── (admin)/admin/     # 後台管理頁面
│   │   ├── (public)/          # 前台公開頁面
│   │   └── api/               # API 路由
│   ├── components/
│   │   ├── ui/                # shadcn/ui 元件
│   │   ├── magazine/          # 期刊相關元件
│   │   ├── ocr/               # OCR 編輯器元件
│   │   └── import/            # CSV 匯入元件
│   ├── lib/
│   │   ├── auth.ts            # Auth.js 設定
│   │   ├── prisma.ts          # Prisma client
│   │   ├── group-articles.ts  # 文章分組工具
│   │   ├── resolve-image-url.ts
│   │   └── validators/        # Zod 驗證 schema
│   └── services/
│       └── ai/                # AI OCR 服務
│           ├── ocr.interface.ts
│           ├── ocr.factory.ts
│           └── providers/     # Claude, OpenAI, Gemini
├── src/__tests__/             # 單元測試
├── docs/                      # 部署文件
├── Dockerfile
└── docker-compose.yml
```

## 資料模型

### 核心實體

- **Magazine** - 期刊（名稱、出版社、ISSN）
- **Issue** - 期數（期號、出版日期、封面、目錄頁、排序）
- **Article** - 文章（標題、作者、頁碼、分類）
- **Tag** - 標籤（人物、活動、系列、公司、平台）
- **Game** - 遊戲（平台、開發商、發行商、類型）

### 關聯

```
Magazine 1:N Issue 1:N Article
Article N:N Tag  (ArticleTag)
Article N:N Game (ArticleGame)
```

## 頁面路由

### 前台

| 路徑 | 功能 |
|------|------|
| `/` | 首頁（統計、最新期數、最近更新、熱門遊戲） |
| `/magazines` | 期刊列表 |
| `/magazines/[id]` | 期刊詳情 + 期數列表 |
| `/magazines/[id]/issues/[issueId]` | 期數目錄 |
| `/games` | 遊戲列表 |
| `/games/[id]` | 遊戲相關文章 |
| `/tags` | 標籤索引 |
| `/tags/[id]` | 標籤相關文章 |
| `/search` | 搜尋 |

### 後台

| 路徑 | 功能 |
|------|------|
| `/admin` | 儀表板 |
| `/admin/magazines` | 期刊管理 |
| `/admin/magazines/new` | 新增期刊 |
| `/admin/magazines/import` | CSV 批次匯入 |
| `/admin/magazines/[id]` | 期刊詳情（三欄佈局） |
| `/admin/magazines/[id]/issues/[issueId]` | 期數詳情 + 文章管理 |
| `/admin/articles` | 文章管理 |
| `/admin/tags` | 標籤管理 |
| `/admin/tags/[id]` | 標籤詳情 + 關聯文章 |
| `/admin/games` | 遊戲管理 |
| `/admin/games/[id]` | 遊戲詳情 + 關聯文章 |
| `/admin/ocr` | AI 目錄辨識 |
| `/admin/users` | 使用者管理 |

## API 端點

### 期刊 / 期數 / 文章

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET/POST | `/api/magazines` | 期刊列表 / 新增 |
| GET/PUT/DELETE | `/api/magazines/[id]` | 期刊 CRUD |
| GET/POST | `/api/issues` | 期數列表 / 新增 |
| GET/PUT/DELETE | `/api/issues/[id]` | 期數 CRUD |
| PUT | `/api/issues/reorder` | 期數批次排序 |
| GET/POST | `/api/articles` | 文章列表 / 新增 |
| POST | `/api/articles/batch` | 文章批次建立 |
| GET/PUT/DELETE | `/api/articles/[id]` | 文章 CRUD |

### 標籤 / 遊戲 / 使用者

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET/POST | `/api/tags` | 標籤列表 / 新增 |
| GET/PUT/DELETE | `/api/tags/[id]` | 標籤 CRUD |
| GET/POST | `/api/games` | 遊戲列表 / 新增 |
| GET/PUT/DELETE | `/api/games/[id]` | 遊戲 CRUD |
| GET | `/api/users` | 使用者列表 |
| GET/PUT | `/api/users/[id]` | 使用者詳情 / 更新角色 |

### 其他

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/ocr` | AI 目錄辨識 |
| GET | `/api/ocr` | 取得可用 AI Provider 列表 |
| POST | `/api/upload` | 圖片上傳 |
| POST | `/api/import/magazines-issues` | CSV 批次匯入 |

## 部署

支援三種部署方式，詳見 `docs/` 目錄：

- **Vercel**（推薦）— 見 [docs/deployment.md](docs/deployment.md)
- **Docker** — 見 [docs/docker-deployment.md](docs/docker-deployment.md)
- **本地開發** — 見 [docs/local-development.md](docs/local-development.md)

## 開發指令

```bash
pnpm dev            # 開發伺服器
pnpm build          # 建置
pnpm start          # 啟動 production
pnpm lint           # 程式碼檢查
pnpm test           # 執行測試
pnpm test:watch     # 測試（監聽模式）
pnpm test:coverage  # 測試覆蓋率
npx prisma studio   # 資料庫 GUI
```

## 測試

使用 Jest 進行單元測試，涵蓋所有 validators、工具函式與核心邏輯。

```
src/__tests__/lib/
├── utils.test.ts
├── group-articles.test.ts
├── resolve-image-url.test.ts
└── validators/
    ├── magazine.test.ts
    ├── issue.test.ts
    ├── article.test.ts
    ├── tag.test.ts
    ├── game.test.ts
    └── reorder.test.ts
```

## 授權

MIT License
