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
| `API_TOKEN` | 批次腳本寫入用的 Bearer token | |
| `RAWG_API_KEY` | RAWG API Key，自動抓遊戲封面用 | |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 測量 ID | |

> *至少需要設定一個 AI API Key

#### Google Analytics

`NEXT_PUBLIC_GA_ID` 設了才會掛分析，**只設在 Production**：preview 與本機留空，
否則 PR 的自我測試會混進正式數據。正式站用的是 `G-5K32DKKL1G`。

它不是密鑰——`NEXT_PUBLIC_` 前綴的值會被打包進 client bundle，每個訪客都看得到。
走環境變數是為了讓「哪個環境要送資料」由部署決定，不是寫死在程式裡。

分析掛在 `src/app/(public)/layout.tsx`，所以 `/admin` 與 `/auth` 不計入：自己編目
一整晚的點擊會蓋過真實訪客。**改了要 redeploy 才生效**（見[部署組成](#環境變數管理)）。

```bash
vercel env add NEXT_PUBLIC_GA_ID production
```

貢獻者自己的 per-user token 不是環境變數，存在資料庫裡（`api_tokens`，只有 sha256），
在 `/admin/profile` 產生與撤銷，不必設定也不必 redeploy。

#### 打正式站用哪一把 token

**預設是 per-user token**（Keychain 的 `tocr-prod-token-claude`）。腳本走
`scripts/prod-token.ts` 的 `productionToken()` 取值，不必自己拼 `security` 指令；
要改用備用那把就把 service name 傳進去。

per-user token 是首選，因為署名與撤銷都對得上人：寫入等同本人操作，`edit_logs`
記下是誰、並標記走的是 API，撤銷只是在 `/admin/profile` 按一下。共用的 `API_TOKEN`
一律掛給司書(NPC)，要撤銷得改 Vercel 環境變數再 redeploy，所以留作備用。

#### API_TOKEN 存哪裡

`API_TOKEN` 是對稱的共享密鑰：伺服器拿請求帶來的值跟自己的 `process.env.API_TOKEN`
比對，所以打哪一台就要用哪一台的值。**正式站與本機各一把，不要共用**——`.env.local`
會被 dev server 載入，正式站的密鑰不該放在那裡。

- 正式站那把設在 Vercel（Production scope）。改了要 redeploy 才生效：部署在建立當下
  就把環境變數固定了
- 本機開發用的另外 `openssl rand -base64 32` 產一把，放 `.env.local`
- 要從本機用腳本寫進正式站時，正式站那把存在 macOS Keychain，不落地成檔案：

```bash
# 存（-U 表示已存在就更新）
security add-generic-password -s tocr-prod-api-token -a "$USER" -w '<token>' -U
# 取
security find-generic-password -s tocr-prod-api-token -a "$USER" -w
```

per-user token 存法相同，只是換一個 service name（`tocr-prod-token-claude`）。
**一個用途一支**——不同機器、不同用途各自產一支，撤掉一支不會連累其他的，
而 `/admin/profile` 的「最後使用」看得出哪支還活著。

**兩者都不要落成檔案**：除了 `.env.local` 會被 dev server 載入之外，repo 裡的檔案
讀得到的不只有人——寫給 AI 跑的腳本也讀得到，token 一旦成為檔案就可能被 grep 出來、
貼進對話、留在某段輸出裡。讓腳本在執行當下自己去 Keychain 取，明碼不必經過任何人的手。

不要用 `.env.production`：那個檔名不在 `.gitignore` 的 `.env.*.local` 規則內，會被
commit 進 repo，而且 `NODE_ENV=production` 時（例如本機 `pnpm build && pnpm start`）
Next.js 會載入它。

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

備份是自動的，跑在 GitHub Actions 上，存到 Cloudflare R2。

| 對象 | 排程 | Workflow | 大小 | 實測耗時 |
|---|---|---|---|---|
| 資料庫 | 每日 03:00（台北） | `backup-database.yml` | 加密後約 370 KB | 約 1 分鐘 |
| 圖片 | 每週一 04:00（台北） | `backup-images.yml` | 目前 127 MB，只複製新增的 | 首次全量 17 分鐘；無新增時 8 秒 |

圖片鏡像是逐檔開一次 AWS CLI，所以首次全量（499 檔）花了 17 分鐘——約 2 秒/檔，成本幾乎都在 CLI 行程啟動而非傳輸。**穩態不受影響**（每週通常只有個位數新增），所以維持現狀；真要重建整個鏡像時知道要等就好。

**為什麼要有這個**：Neon 免費方案的 `history_retention_seconds` 是 21600（**6 小時**），那是 point-in-time restore 的全部窗口。誤刪若沒在 6 小時內發現就回不去，而目錄資料是對著掃描圖一筆筆打出來的。Vercel Blob 則完全沒有版本歷史，刪掉就是刪掉。

### 為什麼分成兩種節奏

資料庫小（`pg_dump` 1.8 MB，gzip 後 333 KB）、天天變、**含個資**；圖片大、只增不改、無個資。所以資料庫每日快照並加密，圖片每週增量鏡像。

`issues/toc/` 那批目錄掃描圖是**唯一完全不可再生**的資產——整個資料庫都是從它們抄出來的。封面多數還能從 nostalibrary 重抓，但檔名與期數的對應只存在資料庫裡。

### 需要的設定

**Cloudflare R2**：建一個 bucket（例如 `tocr-backups`），產一組 R2 API token（Object Read & Write）。

保留策略用 **bucket 的 lifecycle rule**，不要寫在 workflow 裡——CI 裡的刪除迴圈只要有一個 bug 就會清掉它該保護的東西。

**現行設定（2026-08-20 起）**：

| Rule | 前綴 | 動作 |
|---|---|---|
| `expire-db-snapshots` | `db/` | 上傳 30 天後刪除 |

設定位置在 Cloudflare Dashboard → R2 → bucket → Settings → Object lifecycle rules。

**為什麼是 30 天**：這份備份要回答的是「昨天弄壞了，救回來」，不是保存歷史。備份每天一份，30 天就是 30 個還原點；而資料是持續累積的（一期一期抄進去），真要出事時不會有人選兩個月前那份，那等於把中間的謄錄一起丟掉。

**前綴不能留空**，否則會把 `images/` 那份鏡像一起清掉——而那批目錄掃描圖是唯一完全不可再生的資產。

**這條規則接不住的情況**：很久以前混進一筆錯資料、現在才發現時，30 天內的備份全都已經含著它了。那類問題靠 `EditLog` 追（改了什麼、誰改的都查得到），不是靠備份。

**age 金鑰對**：`age-keygen -o backup-key.txt`。公鑰放 GitHub variable，**私鑰自己保管、不要進 CI**（理由見下）。

**GitHub secrets 與 variables**（repo 是 public，但兩者都不會給 fork 的 PR）：

| 名稱 | 放哪 | 說明 |
|---|---|---|
| `BACKUP_DATABASE_URL` | secret | Neon 的 direct 連線字串（非 pooled） |
| `R2_SECRET_ACCESS_KEY` | secret | R2 API token 的密鑰那半 |
| `BLOB_READ_WRITE_TOKEN` | secret | 列出 blob 用 |
| `BACKUP_AGE_RECIPIENT` | secret | age 公鑰。公鑰本身不是機密，放 secret 只是順便讓它在 log 裡被遮掉 |
| `R2_ACCESS_KEY_ID` | variable | 憑證的另一半，單獨拿到沒有用；variable 不會在 log 裡被遮 |
| `R2_ACCOUNT_ID` | variable | Cloudflare 帳號 ID |
| `R2_BUCKET` | variable | bucket 名稱 |

⚠️ **repo 是 public，所以 Actions 的 artifact 也是公開的**——資料庫 dump 絕對不能用 `upload-artifact`，它含 `users.email` 與 `accounts` 的 OAuth token。目前的 workflow 直接串流上傳到 R2，不留在 runner 上。

### 還原

```bash
# 1. 從 R2 取回（或直接在 Cloudflare 後台下載）
aws s3 cp s3://tocr-backups/db/2026-08-17.sql.gz.age . \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com

# 2. 解密並還原
age -d -i backup-key.txt 2026-08-17.sql.gz.age | gunzip | psql "$DATABASE_URL"
```

`pg_dump` 的版本必須 ≥ 伺服器版本。Neon 目前是 **PostgreSQL 18**，用 15 或 16 的 client 會直接拒絕（`aborting because of server version mismatch`）。

⚠️ 光是裝了 `postgresql-client-18` 還不夠——`/usr/bin/pg_dump` 是 pg_wrapper，在同時裝了多版的機器上仍可能挑到舊的。要指名 `/usr/lib/postgresql/18/bin/pg_dump`。

### 定期驗證還原（手動，每季）

**最近一次：2026-08-20**，用 `db/2026-08-19.sql.gz.age`（610 KB）。解得開、灌得進去，五張表的筆數與當下的正式站完全一致：

| | 備份 | 正式站 |
|---|---|---|
| magazines | 37 | 37 |
| issues | 955 | 955 |
| articles | 1843 | 1843 |
| games | 926 | 926 |
| tags | 362 | 362 |

**只備份不驗證，等於不知道備份能不能用。** 這一步刻意不放進 CI：驗證需要 age 私鑰，放進 GitHub secrets 就等於私鑰進了 CI，加密只剩「防 R2 token 外洩」的效果。私鑰留在自己機器上，這一步就手動跑。

```bash
# 1. 開一條臨時 branch（秒級，用完就刪）
neonctl branches create --name restore-test --project-id <project-id>
URL=$(neonctl connection-string restore-test --project-id <project-id>)

# 2. 清空再灌入備份
psql "$URL" -c 'drop schema public cascade; create schema public;'
age -d -i backup-key.txt <最新備份> | gunzip | psql "$URL"

# 3. 斷言筆數與正式庫相近
psql "$URL" -tAc 'select count(*) from issues'

# 4. 收工
neonctl branches delete restore-test --project-id <project-id>
```

#### 在本機驗證（不必開 Neon branch）

私鑰本來就留在自己機器上，所以這一步也可以完全在本機跑，少一層網路與 Neon 額度。下面那串步驟包成了一支腳本，取回備份檔之後只要：

```bash
scripts/verify-backup-restore.sh <日期>.sql.gz.age
# 私鑰預設讀 ~/.config/age/tocr-backup.txt，第二個參數可以指定別的
```

起容器、解密、灌入、報筆數、收容器，中途失敗也會把容器收掉（留著的話下次跑會撞名，而那時的錯誤訊息看起來會像備份有問題）。**取回備份檔仍要自己來**——R2 憑證只在 GitHub secrets 裡，本機沒有。

⚠️ **不要灌進 `tocr-db-dev`**。那支是 `postgres:15-alpine`，而備份是 PG18 的 `pg_dump` 產物——PG17 才有的 `transaction_timeout` 這類 GUC 在 PG15 會報錯，你會分不清是備份壞了還是版本不合；而且灌進去等於洗掉手上的開發資料。開一個拋棄式的 PG18 容器。

```bash
# 1. 取回備份：從 Cloudflare 後台下載，或用 aws CLI（brew install awscli）
aws s3 ls s3://<bucket>/db/ \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com
aws s3 cp s3://<bucket>/db/<日期>.sql.gz.age . \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com

# 2. 拋棄式的 PG18 容器
podman run -d --name tocr-restore-test -e POSTGRES_PASSWORD=postgres postgres:18-alpine
until podman exec tocr-restore-test pg_isready -U postgres; do sleep 1; done

# 3. 灌進一個新資料庫（新建而非清空 public，少一種出錯方式）
podman exec tocr-restore-test psql -U postgres -tAc 'create database restore_test'
age -d -i <你的 age 私鑰> <日期>.sql.gz.age | gunzip \
  | podman exec -i tocr-restore-test psql -U postgres -v ON_ERROR_STOP=1 -q restore_test

# 4. 斷言筆數與正式庫相近
podman exec tocr-restore-test psql -U postgres -tAc \
  'select (select count(*) from magazines), (select count(*) from issues),
          (select count(*) from articles), (select count(*) from games)' restore_test

# 5. 收工
podman rm -f tocr-restore-test
```

**沒有 aws CLI 也可以**，`rclone` 講的是同一個協定，而且憑證走環境變數不會出現在 `ps` 裡：

```fish
set -x RCLONE_S3_PROVIDER Cloudflare
set -x RCLONE_S3_ACCESS_KEY_ID <Access Key ID>
set -x RCLONE_S3_SECRET_ACCESS_KEY <Secret>
set -x RCLONE_S3_ENDPOINT https://<account-id>.r2.cloudflarestorage.com

rclone lsl :s3:tocr-backup/db/ --config /dev/null
rclone copy :s3:tocr-backup/db/<日期>.sql.gz.age . --config /dev/null
```

憑證用一組**唯讀、只綁這個 bucket** 的 R2 API token 就夠（Cloudflare Dashboard → R2 → Manage API tokens → Create API token，權限選 Object Read only）。secret 那半**只在建立當下顯示一次**，之後 Cloudflare 也拿不回來，要重新建一組。

```fish
set -x AWS_ACCESS_KEY_ID     <Access Key ID>
set -x AWS_SECRET_ACCESS_KEY <Secret Access Key>
set -x AWS_DEFAULT_REGION    auto
```

⚠️ **憑證與取回的備份都不要留在 repo 裡**——這個 repo 是 public 的，而 dump 含 `users.email` 與 `accounts` 的 OAuth token。`.gitignore` 已經擋掉 `tocr-local-restore` 與 `*.sql.gz.age`，但那是安全網不是許可。

⚠️ `aws s3 ls` 對**看不到的 bucket** 回的是 `AccessDenied` 而不是 `NoSuchBucket`，所以看到權限錯誤時，也可能只是 bucket 名字打錯。**只綁單一 bucket 的 token 也列不出 bucket 清單**（`ListBuckets` 會 403），那是正常的——bucket 名字看 GitHub variable `R2_BUCKET`。

`ON_ERROR_STOP=1` 不能省——沒有它，psql 會把錯誤印一印繼續跑完，最後 exit 0，於是一份灌不進去的備份看起來像成功。

可攜性沒問題：workflow 的 `pg_dump` 帶 `--no-owner --no-privileges`，dump 裡沒有 Neon 專屬的 role 與 grant；唯一的 extension 是 `pg_trgm`（`20260331000000_add_trgm_search_indexes`），官方 postgres image 內建。

**本機驗證不了的是「灌得進 Neon」**——Neon 專屬的行為只有真開一條 branch 才測得到。但這一步要回答的問題是「備份檔解得開、資料完整」，那本機答得了；真要還原時本來就會在 Neon 上再跑一次。

還原出來的筆數**就是正式站的筆數**（截至該備份日），可以拿來更新文件裡引用的數字——注意是這個容器的數字，不是 `tocr-db-dev` 的。

### 孤兒圖清查

換過的圖不會自己消失：`/api/upload` 每次都產新檔名，欄位改指新網址之後，舊檔就永遠留在 store 裡。本機測試上傳的垃圾檔同樣會進去。

```bash
npx tsx --env-file=.env.local scripts/find-orphan-blobs.ts
```

列出 store 裡沒有任何資料列指向的物件，以及反過來「資料庫指著、store 裡卻沒有」的路徑（那是壞掉的圖，另一種問題）。**只列清單，不刪任何東西**——Vercel Blob 沒有版本歷史，而圖片鏡像是每週一跑的增量，剛上傳又剛被判為孤兒的檔案可能還沒進備份。

⚠️ **資料庫與 store 必須是同一個環境**。`.env.local` 的 `BLOB_READ_WRITE_TOKEN` 指向正式站的 store，而 `DATABASE_URL` 指向本機的 dev 庫——那樣算出來的「孤兒」其實是正式站正在用的圖。所以 `DATABASE_URL` 指著 localhost 時腳本預設拒跑，只想看它跑不跑得動再加 `--allow-local-db`。

比對涵蓋每一個存得下網址的欄位：`magazines.logo_image`／`photos`、`issues.cover_image`／`toc_images`、`games.cover_image`、`ocr_records.image_url`、`users.image`。**新增存網址的欄位時要一起加進去**，漏掉一欄就會把還在用的圖報成孤兒。

### 手動備份

```bash
pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip -9 > backup.sql.gz
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
