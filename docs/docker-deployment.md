# Docker 部署指南

本專案支援使用 Docker 和 Docker Compose 進行部署，適用於自架伺服器或雲端 VPS。

## 前置需求

- Docker 20.10+
- Docker Compose v2.0+
- 至少 2GB RAM
- 10GB 磁碟空間

---

## 快速開始

### 1. 複製專案

```bash
git clone https://github.com/your-username/tocr.git
cd tocr
```

### 2. 設定環境變數

```bash
cp .env.example .env
```

編輯 `.env` 檔案，填入必要的設定值：

```env
# Auth.js（必填）
AUTH_SECRET="your-auth-secret-at-least-32-characters"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# AI OCR（至少需要一個）
DEFAULT_OCR_PROVIDER="claude"
ANTHROPIC_API_KEY="sk-ant-..."
# OPENAI_API_KEY="sk-..."
# GOOGLE_AI_API_KEY="..."

# Vercel Blob（可選，用於圖片儲存）
# BLOB_READ_WRITE_TOKEN="vercel_blob_..."
```

> 注意：`DATABASE_URL` 在 Docker Compose 中會自動設定

### 3. 建置並啟動

```bash
# 建置映像並啟動所有服務
docker compose up -d --build

# 查看日誌
docker compose logs -f

# 查看服務狀態
docker compose ps
```

### 4. 初始化資料庫

首次啟動時，需要執行資料庫遷移：

```bash
docker compose run --rm migrate
```

### 5. 存取應用程式

開啟瀏覽器前往 http://localhost:3000

---

## 服務說明

| 服務 | 說明 | 連接埠 |
|------|------|--------|
| `app` | Next.js 應用程式 | 3000 |
| `db` | PostgreSQL 資料庫 | 5432 |
| `migrate` | 資料庫遷移（一次性） | - |

---

## 常用指令

### 啟動與停止

```bash
# 啟動所有服務
docker compose up -d

# 停止所有服務
docker compose down

# 重新建置並啟動
docker compose up -d --build

# 停止並刪除資料（謹慎使用）
docker compose down -v
```

### 查看日誌

```bash
# 查看所有服務日誌
docker compose logs -f

# 只查看應用程式日誌
docker compose logs -f app

# 只查看資料庫日誌
docker compose logs -f db
```

### 資料庫操作

```bash
# 進入資料庫 CLI
docker compose exec db psql -U postgres -d tocr

# 備份資料庫
docker compose exec db pg_dump -U postgres tocr > backup.sql

# 還原資料庫
cat backup.sql | docker compose exec -T db psql -U postgres -d tocr
```

### 更新部署

```bash
# 拉取最新程式碼
git pull

# 重新建置並重啟
docker compose up -d --build

# 執行資料庫遷移（如有 schema 變更）
docker compose run --rm migrate
```

---

## 生產環境建議

### 1. 使用外部資料庫

生產環境建議使用外部管理的資料庫服務（如 AWS RDS、Cloud SQL）：

```yaml
# docker-compose.prod.yml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}  # 使用外部資料庫
      # ... 其他環境變數
```

### 2. 反向代理

建議搭配 Nginx 或 Traefik 作為反向代理，處理 HTTPS：

```nginx
# nginx.conf 範例
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. 圖片儲存

Docker 環境不支援 Vercel Blob，建議使用：
- **MinIO**：自架相容 S3 的儲存服務
- **AWS S3**：雲端物件儲存
- **本地儲存**：掛載 volume 儲存圖片

### 4. 健康檢查

```bash
# 檢查應用程式健康狀態
curl http://localhost:3000/api/health
```

---

## 資源需求

### 最低需求

| 資源 | 需求 |
|------|------|
| CPU | 1 核心 |
| RAM | 2 GB |
| 磁碟 | 10 GB |

### 建議配置

| 資源 | 需求 |
|------|------|
| CPU | 2+ 核心 |
| RAM | 4+ GB |
| 磁碟 | 20+ GB |

---

## 故障排除

### 應用程式無法啟動

1. 檢查日誌：`docker compose logs app`
2. 確認環境變數已正確設定
3. 確認資料庫已啟動：`docker compose ps db`

### 資料庫連線失敗

1. 等待資料庫完全啟動（約 10-30 秒）
2. 檢查資料庫日誌：`docker compose logs db`
3. 確認資料庫健康：`docker compose exec db pg_isready`

### 映像建置失敗

1. 確認有足夠磁碟空間
2. 清理舊映像：`docker system prune -a`
3. 重新建置：`docker compose build --no-cache`

---

## 與 Vercel 比較

| 項目 | Docker 自架 | Vercel |
|------|-------------|--------|
| 成本 | VPS 費用（$5-20/月） | 免費或 $20/月 |
| 維護 | 需自行維護 | 全託管 |
| 擴展性 | 需手動設定 | 自動擴展 |
| 圖片儲存 | 需另外設定 | Vercel Blob |
| SSL | 需自行設定 | 自動提供 |
| CI/CD | 需自行設定 | GitHub 整合 |

選擇建議：
- **Vercel**：快速上線、不想維護基礎設施
- **Docker 自架**：完全控制、成本考量、隱私需求
