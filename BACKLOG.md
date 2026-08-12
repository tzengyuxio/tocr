# Backlog

想到但還沒要做的事。隨手記，不排優先序；要動工時再評估。
格式：`- [ ] 標題 — 一句說明（日期）`（完成就打勾或刪除）。

- [ ] **收完數據後把 `PERF_LOG` 從 Vercel 移除並 redeploy** — 後台卡頓已解（見下），量測用的環境變數還開著，production log 會一直有 `[perf]` 雜訊（2026-08-12）
- [ ] **`pg-connection-string` 的 SSL mode 警告** — 線上 log 有這則：`prefer`/`require`/`verify-ca` 之後會被當成 `verify-full`，pg-connection-string v3.0.0 / pg v9.0.0 起是 breaking change。目前不影響，升級前要處理（2026-08-12）