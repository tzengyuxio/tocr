---
status: open
created: 2026-09-21
---

# Neon 的免費 compute 額度快用完，要決定升不升方案

2026-09-21 13:32（UTC 05:32）讀到的狀態：`cpu_used_sec = 318565` → **88.49 / 100
CU-hours**，剩 11.51。額度 10/01 00:00 UTC 重置，還有 9.8 天。

**照現在的速率 9/23 中午前後就會用完。** Free 方案沒有超額計費，用完是直接把
compute 停掉——不是降速也不是唯讀，連線會失敗，整站的 DB 不能用，直到重置或升級。

## 錢花在「醒著」，不在查詢

CU-hour = CU 數 × 醒著的小時數。本月 `active_time` 336.8 小時 ÷ `cpu_used` 86.3
CU-h = **0.256**，等於整個月都跑在 autoscaling 的下限 0.25 CU（設定是 0.25–2）。
**沒有任何一次升上去過**，包含 9/11–13 那個建 178 期 2,573 篇的週末。所以：

- 把 max CU 從 2 調小**不會省到錢**（從來沒用到）
- 大批匯入**不會讓帳單變貴**——邊際成本約每小時 2.7 美分
- 儲存也不是問題：全部資料表約 38 MB，每月 $0.03。灌 10 倍資料也才 $0.25

## 為什麼醒著 79%：流量太「勻」，不是太大

9/21 00:00–08:00 的 Vercel log，992 次請求：

- 每小時約 124 次，**約每分鐘 2 次**——量其實很小
- 但請求間隔 p90 只有 42 秒，整夜最長空檔 43.5 分鐘
- 閒置門檻是 5 分鐘，8 小時裡**只湊得出 21 次 ≥5 分鐘的空檔**

半夜三四點的清醒比例（71%）跟白天差不多，而且出現「進了刊物頁、下一秒並發抓光它
所有期」的樣態（00:42:37 一秒內抓 fashion-game 的 8 期），是爬蟲無誤。**但查不到是
誰**：Vercel CLI 的 log 只有 method / path / status / cache，沒有 user-agent 也沒有
IP；deployment events API 拿到的是 build log 不是 runtime request。要查身分得靠
Vercel 儀表板的 Observability、或在 middleware 暫時記一天 UA、或 Cloudflare analytics。

其中 01–03 點的 91 次 `/api`（含 9 次 `POST /api/issues`、5 次 `POST /api/upload`）
與 7 次 `/admin` 是自己在輸資料，不是爬蟲。

## 對策的量化（8 小時基準，現況醒著 4.81 h）

| 對策 | 醒著 | 效果 |
|---|---|---|
| 現況 | 4.81 h | — |
| 修好快取失效 + `revalidate` 拉到 6 小時 | 4.63 h | **只省 4%** |
| `suspend_timeout_seconds` 5 分鐘 → 1 分鐘 | 2.37 h | **省 51%** |

**加快取對帳單幾乎沒用。** 回源次數確實從 834 降到 514，但剩下的還是每 56 秒一次，
一樣湊不出 5 分鐘。砍掉的那些本來就落在「已經醒著」的區間裡，是免費的。

縮 idle timeout 的代價是冷啟動從每天 66 次變 234 次，約 8% 的請求多等半秒左右，
其中絕大多數是爬蟲。

## 要決定的事

**縮 idle timeout 救得了 10 月，救不了 9 月。** 剩 11.51 CU-h 要撐 9.8 天，等於每天
只能醒 4.7 小時（19.6%）；現在是 98%，砍一半到 30% 還是不夠，要砍到五分之一——那
得把爬蟲幾乎全擋掉，會傷到 `robots.ts` 刻意放行的 AI 爬蟲。

所以 9 月只有兩條路：

1. **升 Launch**（$0.106/CU-h，無月費門檻）。9 月剩下這段大約 **$5**，最壞情況（整個
   月的用量都計費）約 **$15**。中途升級怎麼結算那 100 CU-h，Neon 文件沒查到明確說法
2. **接受 9/23 到 10/1 之間停機**

升上去之後仍然該縮 idle timeout——那時省的是真金白銀，每月約從 $20 降到 $10。

## 後續動作

- [x] **決定方案** — 2026-09-23 已升付費方案，停機的風險解除
- [ ] 把 `suspend_timeout_seconds` 從預設 300 改成 60（一個設定、可回復）。
      升級前這是「多買兩天」，**升級後省的是真金白銀**，依上面的量化約每月
      $20 → $10
- [ ] 修公開頁的 ISR 失效（見下節）——為的是延遲與 DB 查詢量，不是省錢
- [ ] 查爬蟲身分（Vercel Observability / middleware 記 UA / Cloudflare analytics），
      跟 [cloudflare-proxy-verification.md](cloudflare-proxy-verification.md) 的
      Bot Fight Mode 那條一起看

## 之後要重新評估的：還要不要靠 idle，還要不要用 Neon

上面整份分析成立的前提是**現在用量很低**——每分鐘 2 次請求，所以「醒著多久」
才是帳單的全部，scale-to-zero 才有意義。這個前提會變：

- 站台用量長起來之後，醒著的比例趨近 100%，縮 idle timeout 這類手段就失效，
  成本重新由 CU 數與查詢量決定
- **三站（nostalib、cdosgame、tocr）如果共用同一個庫**（見 BACKLOG 的「統一資料庫
  的長期方向」），存取模式會完全不同：多來源、跨時段，更湊不出空檔

到那時要重問的是方案層級的問題，不是參數：繼續 Neon、自建 Postgres、還是換別的
託管。**現在不必決定**，但別把「靠 idle 省錢」當成長期架構——它是低用量期的權宜，
不是設計。

## 附：`auth()` 讓五個公開頁的 ISR 完全失效

實測對照（834 次頁面請求）：

| 路由 | 請求數 | MISS 率 |
|---|---|---|
| 有呼叫 `auth()` | 780 | **100%**（連 STALE 都沒有） |
| 無呼叫 `auth()`（`/tags`、`/timeline`、`/magazines` 清單） | 32 | 72%（STALE 7、PRERENDER 2） |

這五個檔都在頂層 `await auth()`：

```
src/app/(public)/page.tsx:23
src/app/(public)/magazines/[id]/page.tsx:86
src/app/(public)/magazines/[id]/issues/[issueId]/page.tsx:127
src/app/(public)/games/[id]/page.tsx:83
src/app/(public)/tags/[id]/page.tsx:74
```

`auth()` 要讀 cookie，**Next.js 一偵測到 render 過程讀 cookie 就把該頁判成動態渲染，
檔案最上面的 `export const revalidate = 60` 直接失去意義**，而且不會有任何警告——看
程式碼會以為快取是開著的。

`session` 只拿來算 `canEdit`，決定要不要顯示編輯按鈕。**為了五個人看得到編輯按鈕，
全站對所有訪客都不能快取**，而那五頁每次 render 要打 4–7 次 prisma。

修法：把 `canEdit` 移到 client component（`useSession()` 或打一次
`/api/auth/session`），頁面就不再讀 cookie。副作用是編輯按鈕晚一瞬間出現，訪客看不到
那個按鈕所以無感。

第二步是把 `revalidate` 從 60 秒拉長。爬蟲抓 423 個不同路徑，同一個 URL 一分鐘內不會
被抓第二次，60 秒等於沒有；拉到 6 小時在這 8 小時樣本裡命中率從 28% 升到 49%。寫入都
走 API，之後要精準可以改用 `revalidateTag`。

沒有任何頁面用 `generateStaticParams`，所以連 build 時預先產生都沒有，全部 on-demand。
