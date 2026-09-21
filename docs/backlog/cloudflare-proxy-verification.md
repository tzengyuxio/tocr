---
status: open
created: 2026-09-21
---

# 轉橘雲之後的驗證清單

2026-09-21 `tocr.simagame.me` 從 grey cloud 改成 proxied，走 Cloudflare。已確認生效：
`dig` 解出 `104.21.80.177` / `172.67.152.180`（Cloudflare anycast，不再是 Vercel 的
216.150.x），回應帶 `server: cloudflare` 與 `cf-ray`。首頁開得起來，所以 SSL 模式至少
不是 Flexible（那會無限轉址）。

動機是 GA4 報表裡 28 天有 416 個德國 session（desktop、OS 回報 `(not set)`、Direct、
互動率 1.2%），佔總 session 的 33%，幾乎確定是無頭瀏覽器爬蟲。完整脈絡在
`~/works/simagame/ga4-bot-runbook.html`（三個站共用的手冊）。

下面四件事在灰雲時期**不可能驗**——那時 Cloudflare 根本不在路徑上。現在它們都是活的
風險，而且三件的失敗樣態都是安靜的。

## 1. OCR 會不會撞上 100 秒上限

**風險最高的一項。** Cloudflare 對「origin 的第一個位元組」有 100 秒上限，Enterprise
以下不可調；而辨識一張密集目錄頁要 65 秒，模型跑迴圈的病態頁超過 150 秒。

已經改過（PR #161 / `c245e8f`）：`/api/ocr` 現在一進來就先送一個空白位元組、之後每
15 秒補一個，答案出來才寫 JSON。**但只在灰雲時期跑過本機測試**，沒有在真的有 proxy
的路徑上驗過。

驗法：拿一張已知的密集目錄頁在正式站跑一次辨識。要花一次模型呼叫，也會寫一筆
`OcrRecord`（不建文章）。

判讀：
- 正常 = 回 JSON，成功有 `result`、失敗有 `error`（契約變了，**狀態碼一律 200**，見
  [docs/routes.md](../routes.md)）
- 撞上上限 = Cloudflare 的 HTML 錯誤頁，**524**

## 2. Bot Fight Mode 有沒有被開起來

如果開了，會靜默推翻 `src/app/robots.ts` 裡 2026-08-22 刻意放行 AI 爬蟲的決定——Free
版的 Bot Fight Mode 不區分「已驗證的機器人」（那是 Super Bot Fight Mode 才有的分項
設定），GPTBot、ClaudeBot、PerplexityBot、CCBot 會一起被 challenge。

壞掉沒有即時訊號，徵兆是幾個月後模型講到這批雜誌時不再引用這裡。

驗法：`curl -A GPTBot https://tocr.simagame.me/`，看回的是頁面還是 challenge。

## 3. 帶 Bearer token 的腳本還通不通

Bot Fight Mode 對不具瀏覽器特徵的請求發 JS challenge，所以本機用
`Authorization: Bearer` 打正式站寫入 API 的批次腳本會收到 challenge 的 HTML 而不是
JSON。應對是 WAF 加一條 skip：`/api/*` 且帶 `Authorization` header 的直接放行，排在
Bot Fight Mode 之前。

驗法（不花錢、不寫資料）：帶 token 打 `POST /api/ocr` 但不附任何圖，應該回 400 的
JSON `No images provided...`。回 HTML 就是被 challenge 了。

## 4. WAF 規則有沒有誤傷真人

手冊建議的規則是 `(ip.geoip.country in {"DE" "CN"}) and not http.request.uri.path in
{"/robots.txt" "/sitemap.xml"}`，動作選 **Managed Challenge 而不是 Block**——懷舊圖書館
的中國流量裡有 103 個 session 是自然搜尋進來的真人（互動率 68%），Block 會把讀者一起
擋在門外。TOCR 這邊要確認實際設的是哪一個。

## 效果驗證

過幾天回頭看 GA4：德國那批 session 應該明顯下降。如果沒有，表示爬蟲繞過了
Managed Challenge，要再看別的特徵。注意設定只對**之後**收到的資料生效，8、9 月的
髒數字永遠留在報表裡。
