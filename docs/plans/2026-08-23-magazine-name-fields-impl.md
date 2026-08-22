# Magazine 名稱欄位調整 實作規劃

Date: 2026-08-23

設計依據：[`2026-08-23-magazine-name-fields-design.md`](2026-08-23-magazine-name-fields-design.md)。
這份只寫「怎麼改」。slug 規範是下一階段的事，本次不動任何 slug 值。

## 目標

| 欄位 | 動作 |
| --- | --- |
| `Magazine.nameOriginal` | **改名**成 `nameParallel`（30 本裡只有 1 筆有值，且在新語意下就屬於這一欄） |
| `Magazine.nameParallel` | **新增** `String?`：刊物自印、與正題名並列的另一語言刊名，存招牌形式 |
| `Magazine.sourceTitle` | **新增** `String?`：本刊整體翻譯／授權自哪一本外刊；空即非翻譯刊 |
| `Magazine.aliases` | 語意收窄成俗稱／其他寫法，**欄位本身不動** |
| `MagazineTitle.titleParallel` | **新增** `String?`：該時期的並列刊名 |

## 為什麼可以一次做完

`nameOriginal` 只有 1/30 有值，而那個值（次世代遊戲情報 = Next Generation）在新語意下
本來就屬於 `nameParallel`。所以：**沒有資料遷移、沒有相容期、不需要雙寫**，migration 用
rename 而非 drop + add，那一筆值原地就位。這是趁資料還空的時候改，與既有偏好一致。

## 步驟

### 1. Schema 與 migration

`prisma/schema.prisma`：

- `Magazine` 刪 `nameOriginal`，新增 `nameParallel String? @map("name_parallel")` 與
  `sourceTitle String? @map("source_title")`
- `MagazineTitle` 新增 `titleParallel String? @map("title_parallel")`
- 索引：既有的 `@@index([nameOriginal(...)], type: Gin, map: "idx_magazines_name_en_trgm")`
  改掛到 `nameParallel`。**`map` 也一併改名**成 `idx_magazines_name_parallel_trgm`——那個
  名字已經是第二手歷史包袱（現名還停在更早的 `nameEn`），這次順手清掉

欄位註解要寫清楚語意，特別是 `sourceTitle` 的判準（「本刊整體即該外刊的中文版」，不是
「有文章授權」——見設計文件的電腦玩家案例）。

migration 用 `prisma migrate dev --name replace_magazine_name_original`，**不要 `db push`**
（見 memory：migration 歷史是補基準線來的）。

驗證：`prisma migrate status` 乾淨、`npx prisma generate` 後型別編得過。

### 2. Validator

`src/lib/validators/magazine.ts`：

- `nameOriginal: optionalText` → `nameParallel: optionalText`、`sourceTitle: optionalText`
- `magazineUpdateSchema` 走 `.partial()`，自動跟著變，不必另外處理
- `src/__tests__/lib/validators/magazine.test.ts` 補兩個欄位的 pass/blank 案例

### 3. 讀取端

| 檔案 | 改什麼 |
| --- | --- |
| `src/lib/magazine-browse.ts:185,202,234` | 型別與 select 的 `nameOriginal` → `nameParallel`（`sourceTitle` 列表頁用不到，先不 select） |
| `src/components/magazine/MagazineList.tsx:54` | 副標欄位改名 |
| `src/components/magazine/MagazineListClient.tsx:23,91,93` | 同上 |
| `src/components/import/ImportPreviewTable.tsx:99` | 同上 |

顯示行為不變：仍是刊名底下一行副標，只是資料來源換了欄位。差別是**這次會有值**
（現行 30 本裡只有 1 本填了，等於這行副標幾乎從來沒出現過）。

### 4. 表單

`src/components/magazine/MagazineForm.tsx`：

- 「原文名稱」欄（:156–160）改成 **「並列刊名」**，`nameParallel`。placeholder 給
  `ACE`、`TV GAME MAGAZINE` 這種實例，說明存的是招牌形式不是最完整形式
- 新增 **「原刊刊名」** 欄，`sourceTitle`，說明只在「本刊整體是該外刊的中文版」時填
- `MagazineTitleSection.tsx` 加 `titleParallel` 欄位

`aliases` 欄的說明文字要跟著改：現在它只收俗稱與其他寫法，改名進 `MagazineTitle`、
並列刊名進 `nameParallel`、原刊進 `sourceTitle`。

### 5. API

`src/app/api/magazines/route.ts` 與 `[id]/route.ts` 走 validator 的型別，理論上不必改；
`titles` 兩支同理。**要實際確認有沒有寫死的欄位清單**，有就一併改。
`src/__tests__/api/magazines.test.ts` 跟著更新。

### 6. 資料回填

設計文件的「現有資料怎麼歸位」那張表是回填清單。走 API 不走 SQL（見 memory：直接
UPDATE 會漏掉 edit log）。

分兩批：

1. **既有 `aliases` 的八本**——把並列刊名與原刊挑出來，`aliases` 只留俗稱
2. **查封面新得到的十幾本**——`nameParallel` 從無到有，見 slug 規範文件的對照表

`cgw` 的「遊戲世界」與 `htntd` 的「任天堂程式解法大公開」是改名，該進 `MagazineTitle`，
不在本次範圍（BACKLOG 已有「其餘改名刊的沿革資料」一項）。

### 7. 文件

- `docs/data-conventions.md` 加一節「名稱欄位」：四種關係、各自的家、`sourceTitle` 的判準、
  `nameParallel` 存招牌形式而非最完整形式、出處的證據來源（封面刊頭、小 logo、官方網域、
  版權頁、社論自稱）
- 同一份文件的「單值欄位取創刊時的版本」補一句：`nameParallel` 適用同一原則

## 實作後的修正

規劃低估了兩件事，記在這裡免得下次再猜：

**影響範圍是 20 個檔案，不是 5 個。** 規劃只列了 `MagazineForm`、兩個列表、
`magazine-browse`、`ImportPreviewTable`，實際還有：公開雜誌列表與詳情頁、`/search` 的
查詢與卡片、`llms.txt`、`GET /api/magazines` 的搜尋條件、`/api/export` 與 `/api/import`
的欄位、CSV 的匯出表頭與匯入解析、後台雜誌詳情頁的 select，以及六個測試檔。教訓是
**盤點欄位影響要 `rg` 全庫**，不能只看「哪裡顯示它」。

**CSV 欄名是對外契約。** `magazine_name_original` 同時是匯出表頭與匯入欄名，改名等於改
契約。既有程式碼已有先例（parser 同時收 `magazine_name_en` 與 `magazine_name_original`），
照那個模式再加一層：匯出寫 `magazine_name_parallel`，匯入三個都收，範本只教新的。
`CsvImporter.test.tsx` 那條「範本必須涵蓋 parser 讀得到的每個欄位」的測試把這件事擋了
下來——它是唯一自動抓到契約漏洞的地方。

**migration 是手寫的 rename，不是 drop + add。** `prisma migrate dev` 在非互動環境遇到
破壞性變更會直接中止（連 `--create-only` 也是），所以 SQL 手寫：
`ALTER TABLE ... RENAME COLUMN`、`ALTER INDEX ... RENAME TO`，再把空字串正規化成 NULL。
好處是既有那筆值原地就位，GIN 索引也不必重建。

## 驗證

| 步驟 | 怎麼驗 |
| --- | --- |
| 1 | `prisma migrate status` 乾淨；`prisma generate` 後 `tsc --noEmit` 過 |
| 2 | `npm test -- validators/magazine` |
| 3–5 | `npm test`；`npm run lint` |
| 4 | 後台實際新增／編輯一本刊，三個欄位都存得進去、讀得出來 |
| 6 | 回填後隨機抽三本，前台雜誌頁副標顯示正確 |

**後台驗證要用 Safari**（見 memory：後台實際使用的是 Safari，WebKit 專屬的版面問題在
Chrome 截圖裡看不到）。

## 不做什麼

- **不動 `Game.nameOriginal` 與 `Game.nameEn`。** 遊戲沒有「並列刊名」這個概念，
  那組欄位是不是同一個問題要另外判斷
- **不動任何 slug。** 名稱欄位是 slug 規範的前置，但兩件事分開上
- **不做 `nameAbbr`。** ACE 之於 Amazing Computer Entertainment 是同一個並列刊名的長短
  兩種形式，不是另一種關係
- **不做 `MagazineName` 表。** 理由見設計文件

## 風險

低。`nameOriginal` 幾乎全空，改的是欄位名與表單標籤，沒有資料遷移，回滾就是把 migration
倒回去。

**索引改名**採 `ALTER INDEX ... RENAME TO`，不是 drop + create——後者在有資料時會重建
整個 GIN 索引。這裡資料量小，但 rename 本來就是對的做法。
