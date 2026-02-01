# 部署指南

本專案設計為部署到 Vercel 平台，使用 Vercel Postgres 或外部 PostgreSQL 服務。

## 部署到 Vercel

### 前置準備

1. [Vercel 帳號](https://vercel.com/signup)
2. [GitHub 帳號](https://github.com)（用於連接專案）
3. PostgreSQL 資料庫（Vercel Postgres、Supabase、Neon 等）
4. Google OAuth 憑證
5. AI API Key（Claude / OpenAI / Gemini 至少一個）

---

### 步驟 1：準備資料庫

#### 選項 A：Vercel Postgres（推薦）

1. 登入 [Vercel Dashboard](https://vercel.com/dashboard)
2. 前往「Storage」>「Create Database」
3. 選擇「Postgres」
4. 複製連線字串

#### 選項 B：Supabase

1. 前往 [Supabase](https://supabase.com/) 建立專案
2. 在「Settings」>「Database」取得連線字串
3. 使用 Connection Pooling 模式（Transaction mode）

#### 選項 C：Neon

1. 前往 [Neon](https://neon.tech/) 建立專案
2. 複製連線字串

---

### 步驟 2：設定 Vercel Blob（圖片儲存）

1. 在 Vercel Dashboard 前往「Storage」
2. 選擇「Blob」>「Create Store」
3. 建立後會自動產生 `BLOB_READ_WRITE_TOKEN`

---

### 步驟 3：匯入專案到 Vercel

1. 將專案推送到 GitHub
2. 前往 [Vercel New Project](https://vercel.com/new)
3. 選擇你的 GitHub repository
4. 點擊「Import」

---

### 步驟 4：設定環境變數

在 Vercel 專案設定中加入以下環境變數：

| 變數名稱 | 說明 | 必填 |
|----------|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 | ✓ |
| `AUTH_SECRET` | Auth.js 密鑰（至少 32 字元） | ✓ |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID | ✓ |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret | ✓ |
| `DEFAULT_OCR_PROVIDER` | 預設 AI Provider（claude/openai/gemini） | |
| `ANTHROPIC_API_KEY` | Claude API Key | * |
| `OPENAI_API_KEY` | OpenAI API Key | * |
| `GOOGLE_AI_API_KEY` | Google AI API Key | * |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob Token | |

> *至少需要設定一個 AI API Key

#### 產生 AUTH_SECRET

```bash
openssl rand -base64 32
```

---

### 步驟 5：更新 Google OAuth Redirect URI

在 Google Cloud Console 中新增正式環境的 Redirect URI：

```
https://your-project.vercel.app/api/auth/callback/google
```

如果使用自訂網域：

```
https://your-domain.com/api/auth/callback/google
```

---

### 步驟 6：部署

1. 點擊「Deploy」開始部署
2. 等待建置完成
3. 首次部署會自動執行 `prisma generate`

---

### 步驟 7：初始化資料庫

部署完成後，需要將 Schema 推送到資料庫：

```bash
# 在本地端設定 DATABASE_URL 為 production 資料庫
DATABASE_URL="your-production-database-url" npx prisma db push
```

或在 Vercel 專案中使用 CLI：

```bash
vercel env pull .env.production.local
npx prisma db push
```

---

## 自訂網域

1. 在 Vercel 專案設定中前往「Domains」
2. 新增你的網域
3. 依照指示設定 DNS 記錄
4. 更新 Google OAuth Redirect URI

---

## CI/CD 設定

Vercel 預設會在每次推送到 main 分支時自動部署。

### 預覽部署

- 每個 Pull Request 會產生預覽 URL
- 可在 PR 中直接測試變更

### 環境分離

| 分支 | 環境 |
|------|------|
| `main` | Production |
| 其他分支 | Preview |

---

## 監控與日誌

### Vercel Dashboard

- 「Deployments」：查看部署歷史
- 「Logs」：查看 Runtime 日誌
- 「Analytics」：查看效能分析

### 資料庫監控

如果使用 Vercel Postgres，可在 Storage 頁面查看：
- 連線數
- 查詢數
- 儲存空間使用量

---

## 環境變數管理

### 開發環境 vs 生產環境

在 Vercel 中可以為不同環境設定不同的變數值：

- **Production**：正式環境（main 分支）
- **Preview**：預覽環境（PR 分支）
- **Development**：本地開發

### 敏感資訊保護

- 永遠不要將 `.env.local` 提交到 Git
- 使用 Vercel 的環境變數管理功能
- API Key 僅在需要的環境設定

---

## 常見問題

### Build 失敗：Prisma Client not generated

確保 `package.json` 中有 postinstall hook：

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### 資料庫連線失敗

1. 確認 `DATABASE_URL` 格式正確
2. 確認資料庫允許來自 Vercel IP 的連線
3. 如使用 Supabase，確認使用 Connection Pooling URL

### OAuth 登入失敗

1. 確認 Redirect URI 已加入 Google Cloud Console
2. 確認使用 HTTPS（Vercel 預設提供）
3. 確認 `AUTH_SECRET` 已設定

### 圖片上傳失敗

1. 確認 `BLOB_READ_WRITE_TOKEN` 已設定
2. 確認 Vercel Blob Store 已建立

---

## 效能優化

### 建議設定

1. **Edge Runtime**：API Routes 可考慮使用 Edge Runtime
2. **ISR**：適合的頁面可使用 Incremental Static Regeneration
3. **Image Optimization**：使用 Next.js Image 元件

### 快取策略

- 靜態資源自動快取
- API 回應可設定 `Cache-Control` header

---

## 成本考量

### Vercel

- **Hobby**：免費，適合個人專案
- **Pro**：$20/月，適合團隊專案

### 資料庫

- **Vercel Postgres**：有免費額度
- **Supabase**：免費方案 500MB
- **Neon**：免費方案 3GB

### AI API

依使用量計費，建議：
- 設定用量上限
- 監控 API 使用量
- 選擇適合的模型（如使用 claude-sonnet 而非 opus）

---

## 備份與還原

### 資料庫備份

```bash
# 使用 pg_dump 備份
pg_dump $DATABASE_URL > backup.sql

# 還原
psql $DATABASE_URL < backup.sql
```

### Prisma 遷移

```bash
# 建立遷移
npx prisma migrate dev --name description

# 應用遷移到生產環境
npx prisma migrate deploy
```

---

## 安全性檢查清單

- [ ] 所有 API Key 使用環境變數
- [ ] `AUTH_SECRET` 使用強密碼
- [ ] 資料庫連線使用 SSL
- [ ] Google OAuth 設定正確的 Redirect URI
- [ ] 敏感路由有權限檢查
- [ ] 定期更新依賴套件
