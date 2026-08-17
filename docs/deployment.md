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
| `DATABASE_URL` | PostgreSQL 連線字串（pooled） | ✓ |
| `DATABASE_URL_UNPOOLED` | 直連字串，build 時跑 migration 用 | ✓ |
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

### 步驟 7：資料庫 migration

**production 與 preview 部署都會在 build 時自動跑 `prisma migrate deploy`**（見 `package.json` 的 `build`），因為兩者用的是不同的資料庫。

migration 走 `DATABASE_URL_UNPOOLED`（Neon 的 pooler 不適合跑 DDL），沒設的話會退回 `DATABASE_URL`。

### preview 有自己的資料庫（2026-08-17 起）

Neon 專案下有兩條 branch，Vercel 的環境變數分別指過去：

| Vercel 環境 | Neon branch | 說明 |
|---|---|---|
| Production | `production` | 正式資料 |
| Preview | `preview` | 從 `production` 分出的 copy-on-write 副本，所有 PR 共用 |

**在此之前兩者共用同一個資料庫**，所以 build script 用 `VERCEL_ENV = production` 擋住 preview——否則每開一個 PR 就會對正式庫跑 migration。

那道判斷的代價是**任何「對已被預先產生的頁面所查的 model 新增欄位」的 PR，preview build 一定會掛**：preview 不跑 migration，但 `next build` 會預先產生 `revalidate` 的 ISR 頁（`/magazines` 等）並在那時查庫，而 Prisma Client 已經是新 schema。症狀是 CI 全綠、Vercel 紅字，log 為 `The column (not available) does not exist`（P2022）。加新資料表不會觸發，因為 build 時沒人查它。

分開資料庫之後 preview 自己跑 migration，這個問題消失，而且 preview 站變成真的可以點進去驗收。

**preview branch 的資料會隨 PR 累積漂移**（各 PR 共用一條），需要時可以從 `production` 重新分一條。

要手動補跑（例如自動化上線前累積的 migration）：

```bash
DATABASE_URL="<production-unpooled-url>" npx prisma migrate deploy
```

> 不要用 `prisma db push`。本專案的 migration 歷史是補基準線來的，`db push` 會讓它與資料庫脫節。

---

### 執行區域

`vercel.json` 把 serverless function 釘在 `sin1`（新加坡），與 Neon 的 `aws-ap-southeast-1` 同區。

跨區的代價很實際：function 在 iad1、資料庫在新加坡時，量測到函式實例第一次碰 DB 要 1.8–2.3 秒，之後每次暖查詢仍要 436–446ms。注意 Vercel log 裡 middleware 那幾筆顯示的是使用者最近的邊緣節點，不反映這個設定——要看 `type=function` 的 `region` 欄位。

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
