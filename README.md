# TOCR - 期刊目錄索引系統

遊戲雜誌目錄索引網站，支援 AI 圖片辨識自動擷取目錄、多人協作編輯、標籤系統。

## 功能特色

- **期刊管理**：建立期刊基本資料、期數、封面圖片
- **目錄索引**：文章標題、作者、頁碼、分類等完整目錄資訊
- **AI 辨識**：上傳目錄頁圖片，AI 自動辨識並擷取結構化資料
- **標籤系統**：支援人物、活動、系列、公司、平台等多種標籤類型
- **遊戲索引**：遊戲作為特殊標籤，包含平台、開發商、發行日期等詳細資訊
- **多人協作**：Google OAuth 登入，支援 Viewer/Editor/Admin 三種角色

## 技術棧

| 類別 | 技術 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 語言 | TypeScript |
| 資料庫 | PostgreSQL + Prisma ORM |
| 認證 | Auth.js (NextAuth v5) + Google OIDC |
| AI | Claude Vision API (可擴充 OpenAI/Gemini) |
| UI | Tailwind CSS + shadcn/ui |
| 儲存 | Vercel Blob |
| 部署 | Vercel |

## 快速開始

### 環境需求

- Node.js 20+
- PostgreSQL 15+
- pnpm / npm / yarn

### 安裝步驟

1. **複製專案**
   ```bash
   git clone <repository-url>
   cd tocr
   ```

2. **安裝依賴**
   ```bash
   npm install
   ```

3. **設定環境變數**
   ```bash
   cp .env.example .env.local
   ```
   編輯 `.env.local` 填入必要的環境變數（見下方說明）

4. **初始化資料庫**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **啟動開發伺服器**
   ```bash
   npm run dev
   ```

6. **開啟瀏覽器**

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

# AI 服務（選擇性）
DEFAULT_OCR_PROVIDER="claude"
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Vercel Blob 儲存
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"
```

### 取得 Google OAuth 憑證

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立專案或選擇現有專案
3. 啟用 Google+ API
4. 建立 OAuth 2.0 憑證
5. 設定授權重新導向 URI：`http://localhost:3000/api/auth/callback/google`

## 專案結構

```
tocr/
├── prisma/
│   └── schema.prisma       # 資料庫 schema
├── src/
│   ├── app/
│   │   ├── (admin)/        # 後台管理頁面
│   │   ├── (public)/       # 前台公開頁面
│   │   └── api/            # API 路由
│   ├── components/
│   │   ├── ui/             # shadcn/ui 元件
│   │   ├── magazine/       # 期刊相關元件
│   │   └── ocr/            # OCR 相關元件
│   ├── lib/
│   │   ├── auth.ts         # Auth.js 設定
│   │   ├── prisma.ts       # Prisma client
│   │   └── validators/     # Zod 驗證 schema
│   └── services/
│       └── ai/             # AI OCR 服務
│           ├── ocr.interface.ts
│           ├── ocr.factory.ts
│           └── providers/
└── __tests__/              # 單元測試
```

## 資料模型

### 核心實體

- **Magazine** - 期刊（名稱、出版社、ISSN）
- **Issue** - 期數（期號、出版日期、封面、目錄頁）
- **Article** - 文章（標題、作者、頁碼、分類）
- **Tag** - 標籤（人物、活動、系列、公司、平台）
- **Game** - 遊戲（平台、開發商、發行商、類型）

### 關聯

```
Magazine 1:N Issue 1:N Article
Article N:N Tag (ArticleTag)
Article N:N Game (ArticleGame)
```

## 頁面路由

### 前台（公開）

| 路徑 | 功能 |
|------|------|
| `/` | 首頁 |
| `/magazines` | 期刊列表 |
| `/magazines/[id]` | 期刊詳情 + 期數列表 |
| `/magazines/[id]/issues/[issueId]` | 期數目錄 |
| `/games` | 遊戲列表 |
| `/games/[id]` | 遊戲相關文章 |
| `/tags` | 標籤索引 |
| `/tags/[id]` | 標籤相關文章 |

### 後台（需登入）

| 路徑 | 功能 | 權限 |
|------|------|------|
| `/admin` | 儀表板 | Editor+ |
| `/admin/magazines` | 期刊管理 | Editor+ |
| `/admin/magazines/new` | 新增期刊 | Editor+ |
| `/admin/magazines/[id]/issues/new` | 新增期數 | Editor+ |
| `/admin/tags` | 標籤管理 | Editor+ |
| `/admin/games` | 遊戲管理 | Editor+ |
| `/admin/ocr` | AI 辨識 | Editor+ |

## API 端點

### 期刊 (Magazines)

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/magazines` | 取得期刊列表 |
| POST | `/api/magazines` | 新增期刊 |
| GET | `/api/magazines/[id]` | 取得單一期刊 |
| PUT | `/api/magazines/[id]` | 更新期刊 |
| DELETE | `/api/magazines/[id]` | 刪除期刊 |

### 期數 (Issues)

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/issues` | 取得期數列表 |
| POST | `/api/issues` | 新增期數 |
| GET | `/api/issues/[id]` | 取得單一期數 |
| PUT | `/api/issues/[id]` | 更新期數 |
| DELETE | `/api/issues/[id]` | 刪除期數 |

### 文章 (Articles)

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/articles` | 取得文章列表 |
| POST | `/api/articles` | 新增文章 |
| POST | `/api/articles/batch` | 批次新增文章 |
| GET | `/api/articles/[id]` | 取得單一文章 |
| PUT | `/api/articles/[id]` | 更新文章 |
| DELETE | `/api/articles/[id]` | 刪除文章 |

### 標籤 (Tags)

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/tags` | 取得標籤列表 |
| POST | `/api/tags` | 新增標籤 |
| GET | `/api/tags/[id]` | 取得單一標籤 |
| PUT | `/api/tags/[id]` | 更新標籤 |
| DELETE | `/api/tags/[id]` | 刪除標籤 |

### 遊戲 (Games)

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/games` | 取得遊戲列表 |
| POST | `/api/games` | 新增遊戲 |
| GET | `/api/games/[id]` | 取得單一遊戲 |
| PUT | `/api/games/[id]` | 更新遊戲 |
| DELETE | `/api/games/[id]` | 刪除遊戲 |

### 其他

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/upload` | 上傳圖片 |
| POST | `/api/ocr` | AI 目錄辨識 |

## 開發指令

```bash
# 開發伺服器
npm run dev

# 建置
npm run build

# 啟動 production
npm start

# 程式碼檢查
npm run lint

# 執行測試
npm test

# 測試 (監聽模式)
npm run test:watch

# 測試覆蓋率
npm run test:coverage

# Prisma Studio (資料庫 GUI)
npx prisma studio
```

## 測試

專案使用 Jest + React Testing Library 進行測試。

```bash
# 執行所有測試
npm test

# 監聽模式
npm run test:watch

# 產生覆蓋率報告
npm run test:coverage
```

### 測試檔案位置

```
src/__tests__/
├── lib/
│   ├── utils.test.ts
│   └── validators/
│       ├── magazine.test.ts
│       ├── issue.test.ts
│       ├── article.test.ts
│       ├── tag.test.ts
│       └── game.test.ts
└── ...
```

## AI OCR 架構

採用策略模式 + 工廠模式，支援多個 AI 服務商：

```
src/services/ai/
├── ocr.interface.ts      # 統一介面
├── ocr.factory.ts        # Provider 工廠
├── providers/
│   ├── claude.provider.ts
│   ├── openai.provider.ts  (待實作)
│   └── gemini.provider.ts  (待實作)
└── prompts/
    └── toc-extraction.ts   # 目錄擷取 prompt
```

### 使用方式

1. 進入後台 `/admin/ocr`
2. 選擇目標期數
3. 上傳目錄頁圖片
4. AI 辨識後，在編輯器中修正結果
5. 儲存至資料庫

## 授權

MIT License
