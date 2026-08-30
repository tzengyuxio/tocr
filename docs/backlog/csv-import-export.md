---
status: open
created: 2026-08-20
---

# CSV 匯入匯出跟不上資料模型了

2026-08-20 逐欄比對 schema 與 `CSV_HEADERS`／`csvRowSchema` 的結果。同一次盤點裡「範本欄名 `magazine_name_en` 解析器根本不讀」已修，剩下的分三類：

**一、匯出漏欄**（2026-08-20 完成）：補上 `description`、`founded_date`、`notes`。**兩者不對稱是刻意的**（yuxio 2026-08-20）——匯出是備份、匯入是批次建檔的入口，匯出不必餵得回匯入，欄位只會比匯入多。

**二、`alt_numbers` 兩邊都沒有**（2026-08-20 完成）：匯入匯出都加了，分號分隔。`volume_number` 依同一條原則處理：匯出留著（schema 還有值，備份不能漏），範本與匯入頁的欄位說明拿掉（後台表單也已經不顯示），但解析器仍收——既有檔案還帶著它。

**三、整批只存在於後台的欄位**（2026-08-30 完成）：期刊的 `slug`、`aliases`、`categories`、`endedDate`、`logoImage`、`photos`；單期的 `slug`、`coverImage`、`tocImages`、`tocReviewedAt`、`order`，另補了盤點當時還不存在的 `Issue.code` 與 `completeAt`。**只加在匯出**，照「匯出是備份、匯入是入口」那條原則。`code` 是後來想到最該收的一欄：已經分享出去的 `/i/<code>` 網址只認它，還原後換一個就等於把所有分享過的連結弄壞。

同一批加了 `src/__tests__/lib/export-schema-coverage.test.ts`：讀 Prisma DMMF，逼每個 schema 欄位歸進「收」「衍生不收」「還沒決定」三類之一。**備份漏欄不會有症狀**——檔案照樣下載得下來，要到還原那天才發現，所以這裡沒有測試就等於沒有防線。

那支測試現在列著兩個**待決**的欄位，都在 `Article`：`content`（文章全文，收了備份才完整，但一篇全文塞進一格 CSV 會讓檔案大小與可讀性都變樣）與 `sortOrder`（一期之內的文章順序，沒有它還原後的目錄順序回不來，與 `Issue.order` 同一個問題）。

`slug` 那兩欄在匯入端仍然是問題——匯入時是從期號推的，而 [data-conventions.md](docs/data-conventions.md#網址代號與期號是兩回事) 寫明那只是預設值不是規則，所以電玩通那種「slug 是封面日期」的刊物，CSV 匯入根本產不出正確網址。

剩下的還有一件要決定：**匯入永遠只新增、不更新**（`issueNumber` 撞到就跳過）。所以 CSV 修不了既有資料，只能拿來灌新的。

第三類在「匯出是備份」這個定位下比原本更重要：**沒有 slug、封面與目錄頁圖的備份還原不回一個能用的站**。

範本（`CSV_TEMPLATE_HEADERS`）與匯入頁的欄位說明要跟著改，而且**要用測試釘住**——欄名對不上時 zod 只當那一欄沒填，不會報錯，這正是 `magazine_name_en` 藏了那麼久的原因（2026-08-20）。
