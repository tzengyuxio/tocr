---
status: open
created: 2026-08-20
---

# nostalibrary 把電玩通 PS 系列三本併成一筆，要拆開對齊

上游那三本共用一個 slug `fmtps-tw`，而這裡是三筆獨立的期刊：`fmtps2-tw`（電玩通PS2，VOL.1～102）、`fmtpsplus-tw`（電玩通PLAYSTATION +，VOL.103～115）、`fmtpsp-tw`（電玩通PSP+PS3，VOL.116～132）。

**拆開才是編目規則的做法**：正題名改變就另立書目，在附註寫明「改為 XXX」與「繼續自 YYY」——三本的 `description` 都已經照這條寫了。上游併成一筆的話，`data/magazines.json` 回填時會對不起來，`backfill-magazine-categories.ts` 這類以 slug 比對的腳本也會找不到。

**這裡是正本、上游要跟著改**（yuxio 2026-08-20）。順帶一提，`fmtps-tw` 這個代號在這裡沒有用掉，要沿用給其中一本也還來得及（2026-08-20）

**2026-08-22 補齊三本的識別資料**：`fmtpsp-tw` 原本沿用封面的羅馬字刊名 `FAMITSU PSP+PS3 TAIWAN`，已改為中文正題名 `電玩通PSP+PS3`，與另兩本一致；原名進 `aliases`。`fmtps2-tw` 與 `fmtpsp-tw` 也補上 `nameOriginal`（`ファミ通PS2`、`ファミ通PSP+PS3`）與從封面裁下的 `logoImage`，三本至此都有標準字。上游對齊仍未做

## 2026-08-17 簡化盤點

以下來自一次以「找可簡化的地方」為目標的全 repo 盤點，每條都附了呼叫端證據。刻意的重複不在此列：三個 OCR provider 是有意的抽換座（`OPENAI_BASE_URL` 指向自架模型）、`requireEditor()` 與 middleware 的雙重檢查是 [routes.md](docs/routes.md) 寫明的防繞過設計。

**本區 6 條全部完成**（最後兩條是 2026-08-20 的 rate limiter 降級與孤兒圖掃描），內容移到檔尾「已完成」。

## 2026-08-13 code review 待辦

以下來自一次完整的 code review。已修的部分不在此列（`DEV_BYPASS_AUTH` 的 production 護欄、`parsePagination` 的 clamp、contributors 的 eslint error、prisma mock 的 tsc errors、信心度色彩編碼）。

（本區另有 1 條已完成，移到檔尾「已完成」。）
