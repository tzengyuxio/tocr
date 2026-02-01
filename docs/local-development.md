# 本地端開發與測試指南

## 環境需求

- Node.js 20+
- PostgreSQL 15+
- pnpm / npm / yarn

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製環境變數範本：

```bash
cp .env.example .env.local
```

編輯 `.env.local`，填入必要的設定值：

```env
# 資料庫連線（必填）
DATABASE_URL="postgresql://postgres:password@localhost:5432/tocr"

# Auth.js 認證（必填）
AUTH_SECRET="your-auth-secret-at-least-32-characters"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# AI OCR 服務（選擇性，至少需要一個）
DEFAULT_OCR_PROVIDER="claude"
ANTHROPIC_API_KEY="sk-ant-..."
# OPENAI_API_KEY="sk-..."
# GOOGLE_AI_API_KEY="..."

# Vercel Blob（本地開發可略過）
# BLOB_READ_WRITE_TOKEN="vercel_blob_..."
```

### 3. 設定資料庫

#### 使用 Docker（推薦）

```bash
# 啟動 PostgreSQL
docker run --name tocr-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=tocr -p 5432:5432 -d postgres:15

# 驗證連線
docker exec -it tocr-db psql -U postgres -d tocr -c "SELECT 1"
```

#### 使用本地 PostgreSQL

```bash
# macOS (Homebrew)
brew install postgresql@15
brew services start postgresql@15

# 建立資料庫
createdb tocr
```

### 4. 使用 Docker Compose 開發（替代方案）

如果只想用 Docker 啟動資料庫，不想手動安裝 PostgreSQL：

```bash
# 啟動開發用資料庫
docker compose -f docker-compose.dev.yml up -d

# 確認資料庫運行中
docker compose -f docker-compose.dev.yml ps

# 停止資料庫
docker compose -f docker-compose.dev.yml down

# 完全清除（包含資料）
docker compose -f docker-compose.dev.yml down -v
```

### 5. 初始化資料庫 Schema

```bash
# 產生 Prisma Client
npx prisma generate

# 推送 Schema 到資料庫
npx prisma db push
```

### 6. 啟動開發伺服器

```bash
npm run dev
```

開啟瀏覽器前往 http://localhost:3000

---

## 測試

### 執行單元測試

```bash
# 執行所有測試
npm test

# 監聽模式（開發時使用）
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
```

### 測試結果範例

```
PASS src/__tests__/lib/validators/article.test.ts
PASS src/__tests__/lib/validators/issue.test.ts
PASS src/__tests__/lib/validators/game.test.ts
PASS src/__tests__/lib/validators/magazine.test.ts
PASS src/__tests__/lib/validators/tag.test.ts
PASS src/__tests__/lib/utils.test.ts

Test Suites: 6 passed, 6 total
Tests:       83 passed, 83 total
```

---

## 開發工具

### Prisma Studio（資料庫 GUI）

```bash
npx prisma studio
```

開啟瀏覽器前往 http://localhost:5555

### 程式碼檢查

```bash
npm run lint
```

### 建置檢查

```bash
npm run build
```

---

## 取得 Google OAuth 憑證

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立專案或選擇現有專案
3. 啟用 Google+ API
4. 前往「憑證」>「建立憑證」>「OAuth 用戶端 ID」
5. 選擇「網頁應用程式」
6. 設定授權重新導向 URI：
   - 開發環境：`http://localhost:3000/api/auth/callback/google`
   - 正式環境：`https://your-domain.com/api/auth/callback/google`
7. 複製 Client ID 和 Client Secret 到 `.env.local`

---

## 取得 AI API Key

### Claude (Anthropic)

1. 前往 [Anthropic Console](https://console.anthropic.com/)
2. 建立 API Key
3. 設定 `ANTHROPIC_API_KEY`

### OpenAI

1. 前往 [OpenAI Platform](https://platform.openai.com/)
2. 建立 API Key
3. 設定 `OPENAI_API_KEY`

### Gemini (Google AI)

1. 前往 [Google AI Studio](https://aistudio.google.com/)
2. 建立 API Key
3. 設定 `GOOGLE_AI_API_KEY`

---

## 常見問題

### Prisma 錯誤：Cannot find module '.prisma/client/default'

```bash
npx prisma generate
```

### 資料庫連線失敗

1. 確認 PostgreSQL 服務已啟動
2. 確認 `DATABASE_URL` 格式正確
3. 確認資料庫已建立

### Google OAuth 登入失敗

1. 確認 Redirect URI 設定正確
2. 確認 `AUTH_GOOGLE_ID` 和 `AUTH_GOOGLE_SECRET` 正確
3. 確認 `AUTH_SECRET` 長度至少 32 字元

### Build 錯誤：ECONNREFUSED

這是因為 build 時會嘗試連接資料庫進行預渲染。確保：
1. 資料庫服務正在運行
2. 或在 Vercel 部署時設定正確的 `DATABASE_URL`

---

## 開發流程建議

1. **開始開發前**
   - 確認資料庫服務啟動
   - 確認 `.env.local` 設定正確
   - 執行 `npm run dev`

2. **開發過程中**
   - 使用 Prisma Studio 檢視資料
   - 使用 `npm run test:watch` 監聽測試
   - 修改 Schema 後執行 `npx prisma db push`

3. **提交前**
   - 執行 `npm run lint` 檢查程式碼風格
   - 執行 `npm test` 確認測試通過
   - 執行 `npm run build` 確認建置成功
