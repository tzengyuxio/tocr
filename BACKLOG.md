# Backlog

想到但還沒要做的事。隨手記，不排優先序；要動工時再評估。
格式：`- [ ] 標題 — 一句說明（日期）`（完成就打勾或刪除）。

- [ ] **後台頁面切換明顯卡頓** — 本機量測顯示頁面自身的查詢不慢：production build 各頁資料載入 2–14ms，dev 暖機後 60–90ms（#18）。但每次導覽還會經過 `auth()` 的 session 查詢（database session），那才是 cold start 會卡住的地方。已加上 `PERF_LOG=1` 量測（含 `admin/session`），待在實際部署收數據（2026-08-12）