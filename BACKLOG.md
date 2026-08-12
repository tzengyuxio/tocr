# Backlog

想到但還沒要做的事。隨手記，不排優先序；要動工時再評估。
格式：`- [ ] 標題 — 一句說明（日期）`（完成就打勾或刪除）。

- [ ] **後台頁面切換明顯卡頓 — 慢的是第一次資料庫連線，不是查詢** — 線上 `PERF_LOG=1` 收到的數據（2026-08-12）：`admin/edit-logs` 2275ms、`admin/contributors` 2014ms、`admin/session` 1845ms、`admin/dashboard` 1813ms，但同樣的查詢在本機只要 2–14ms。關鍵證據是同一個請求裡 `admin/session` 1845ms 和 `admin/dashboard` 1813ms 幾乎相等——layout 與 page 並行 render，兩者是同時在等同一件事，也就是該函式實例的第一次 DB 連線。**先前「`auth()` 的 session 查詢才是元兇」的假設不成立**，改成 JWT session 只省掉一次 round trip，那 1.8 秒頁面查詢自己照樣要付。
  - **最可能的主因：跨 region。** Neon 在 `aws-ap-southeast-1`（新加坡），Vercel function 卻在 iad1（美東），跨太平洋 RTT 約 220ms——兩個 round trip 正好是那 440ms。已用 `vercel.json` 把 region 釘成 `sin1`，**待部署後重收數據驗證**
  - 驗證方式：log 匯出後看 `type=function` 那幾筆的 `region` 欄位有沒有變成 `sin1`（middleware 那幾筆顯示的是使用者最近的邊緣節點，不反映設定）
  - 若換區後仍偏慢，再查 Neon 的 scale-to-zero 設定
- [ ] **`pg-connection-string` 的 SSL mode 警告** — 線上 log 有這則：`prefer`/`require`/`verify-ca` 之後會被當成 `verify-full`，pg-connection-string v3.0.0 / pg v9.0.0 起是 breaking change。目前不影響，升級前要處理（2026-08-12）