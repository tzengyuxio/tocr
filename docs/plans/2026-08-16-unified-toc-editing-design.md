# Unified TOC Editing Design

Date: 2026-08-16

## Overview

「複查辨識結果」與「文章列表編輯」本質是同一件事：對照目錄頁掃描圖，逐篇校對這期的文章。目前卻是兩套平行實作，各缺對方的長處，而且這個分裂正是重複存檔的來源。

這份設計把兩者收斂成一個編輯畫面，落在**單期編輯頁**。`/admin/ocr` 縮成「上傳與辨識」，辨識結果直接落地成文章，之後的一切都是一般的文章 CRUD。

### 現況與問題

| | 複查頁 `/admin/ocr` | 文章列表（單期編輯頁） |
|---|---|---|
| 編輯對象 | `ocr_records` 裡的辨識結果快照 | 真正的 `articles` |
| 目錄圖對照 | 有（sticky 雙欄、可放大切換） | 無 |
| 遊戲 | 逗號字串，find-or-create | 唯讀，「至進階編輯頁修改」 |
| 標籤 | 逗號字串，find-or-create | 完全沒有 |
| 摘要 | 有 | 無 |
| 插入列 | 有（在此列上／下） | 無（只能加在最後） |
| 排序 | 陣列順序 | 拖曳，寫 `sortOrder` |
| 儲存 | `POST /api/articles/batch`，**只會新增** | `PUT /api/articles/[id]`，逐篇更新 |

因為複查頁載入的是辨識快照而非現有文章，儲存又只有 create path，**同一期複查兩次就會多出一整份文章**。2026-08-16 已在 batch route 加 409 擋下（`confirmDuplicate`），那是止血，不是解法。

正式站 `星際遊樂雜誌 - 1` 因此累積了三份、共 41 篇文章。

### 已定案的前提

1. **單期編輯頁是唯一入口**：文章列表升級成雙欄，`/admin/ocr` 只留上傳與辨識。
2. **辨識完直接寫成文章**：不再有「草稿」型態，`ocr_records` 退回純粹的辨識歷史。
3. **「未確認」沿用 `Issue.tocReviewedAt`**：不新增 Article 欄位，不改公開站的可見範圍。
4. **複查標記改成手動**：由人在看完後按下，不再由儲存動作代勞。

---

## Architecture

以 `ArticleListClient` 為底擴充，把 `OcrResultEditor` 值得留的部分搬過去，然後讓 `OcrResultEditor` 退場。

`ArticleListClient` 已經接真實 API、有拖曳排序、刪除確認與 `router.refresh()` 流程；`OcrResultEditor` 全程操作一個本地陣列，要它吃真實 CRUD 等於重寫 711 行。反向或另起爐灶都會丟掉已經能用的東西。

```
單期編輯頁 /admin/magazines/[id]/issues/[issueId]
├── IssueForm（含「已複查」勾選）      ← 不動
├── AI 目錄辨識卡片                    ← 文案調整
└── ArticleListClient                  ← 升級成雙欄
    ├── TocImageViewer（新，抽自 OcrResultEditor）
    └── 文章列表（既有 dnd）
        └── EditableArticleRow          ← 補齊欄位
            └── CommaListInput（既有）

/admin/ocr
├── 選單期 → OcrUploader → 辨識
└── 落地成文章後導向單期編輯頁          ← 新交棒
```

---

## Feature 1: 辨識後直接落地

### 流程

1. `/admin/ocr` 選定單期、上傳圖、執行辨識（不變）。
2. 辨識成功後，client 直接 `POST /api/articles/batch` 把結果寫成文章。
3. 導向 `/admin/magazines/[magazineId]/issues/[issueId]`，帶著剛建立的文章進入複查。

### 該期已有文章時

不自動落地，跳確認，兩個選項：

- **取代現有 N 篇**：帶 `replaceExisting: true` 送出，transaction 內先刪該期文章再建。
- **取消**：什麼都不做，辨識結果仍在 `ocr_records`。

不提供「附加」。附加正是重複的來源；真要補一兩篇，單期編輯頁的插入功能更合適。

### tocReviewedAt

`POST /api/articles/batch` 不再標記 `tocReviewedAt`（`route.ts:145-155` 整段移除）。**這是行為變更**：現況是人工批次儲存即標記完成複查，但在新流程裡那個時間點人還沒看過任何一篇。

改由單期編輯頁負責：

- 文章列表上方，未複查時顯示橫幅「本期尚未複查，請對照目錄頁逐篇確認」，附「標記為已複查」按鈕。
- 按鈕寫的是同一個 `tocReviewedAt`，與 `IssueForm` 既有的「已複查」勾選（`IssueForm.tsx:249`）等價，只是放在看得到文章的地方。
- API token 的寫入依然不標記，這條規則不變。

---

## Feature 2: 雙欄編輯畫面

### TocImageViewer（新元件）

從 `OcrResultEditor` 抽出，職責單一：顯示一組目錄頁圖片，可切換、可放大。

- Props：`images: string[]`
- 左欄 sticky，高度上限沿用現有算式（viewport 減 header、減 main padding、減自身 top offset）——那段註解解釋了為什麼，一併搬過去。
- `images` 為空時不渲染，由父層決定退回單欄。

### ArticleListClient

- `tocImages` 由單期編輯頁傳入。有圖就雙欄（左 2/5 圖、右 3/5 列表），沒圖維持現在的單欄。
- 新增「在此列上／下插入」：呼叫 `POST /api/articles` 建一篇空白文章（`title` 暫定「（未命名）」以通過必填），插入位置的 `sortOrder` 由既有的 reorder API 重排，然後直接進入該列的編輯狀態。
- 未複查橫幅與「標記為已複查」按鈕。

### EditableArticleRow

補齊複查頁有而這裡沒有的欄位：

- **摘要**：多行 `Textarea`。
- **相關遊戲**：`CommaListInput`，以名稱送出。
- **標籤**：`CommaListInput` + `parseTagInput`／`formatTagInput`，維持 `TYPE:name` 的格式，下方顯示 `TagChip` 預覽。

行內用逗號字串而不是 `ArticleForm` 的 chip picker：複查是連續大量輸入，打字比開 picker 快，而且與原本複查頁的手感一致。`ArticleForm` 的 picker 保留，兩者服務不同情境。

---

## Feature 3: API

### 關聯 resolver（新 module）

`src/lib/resolve-relations.ts`：把名稱解析成關聯 id，沒有就建立。

目前這段邏輯埋在 `batch/route.ts:47-125`（slug 產生、大小寫不敏感比對、`TagType` 正規化、第一個遊戲設為 primary），抽出來讓批次建立與單篇更新吃同一份，避免兩邊行為漂移。

```ts
resolveGameIds(tx, names: string[]): Promise<string[]>
resolveTagIds(tx, tags: TagInput[]): Promise<string[]>
```

### PUT /api/articles/[id]

增加以名稱設定關聯的兩個欄位，與既有的 id 版並存：

| 欄位 | 語意 |
|---|---|
| `gameIds` / `tagIds` | 既有：以 id 設定，不會建立新資料 |
| `games` / `tags` | 新增：以名稱設定，find-or-create |

同一次請求兩種只能擇一，同時給就回 400。編輯紀錄的 diff 沿用現有的 `diffIds`，記的是解析後的 id。

### POST /api/articles/batch

- 新增 `replaceExisting: boolean`：transaction 內先 `deleteMany({ where: { issueId } })` 再建立。
- 移除 `confirmDuplicate` 與 409 —— 語意改由 `replaceExisting` 明確承載，不再需要「你確定嗎」那層。
- 移除 `tocReviewedAt` 的標記。

不帶 `replaceExisting` 時仍是單純附加，匯入腳本（API token）靠的就是這個行為。後台不再提供附加的入口，所以人不會再誤觸。

**注意**：`replaceExisting` 會連同既有文章的標籤與遊戲關聯一併刪除（`onDelete: Cascade`）。確認對話框要講清楚這件事。

---

## Testing

| 對象 | 測什麼 |
|---|---|
| `resolve-relations` | 找得到既有的就重用、找不到才建立、大小寫不敏感、slug 產生、tag type 正規化 |
| `POST /api/articles/batch` | `replaceExisting` 先刪後建且在同一 transaction；不帶時維持附加；不再碰 `tocReviewedAt` |
| `PUT /api/articles/[id]` | `games`／`tags` 以名稱設定關聯；與 `gameIds`／`tagIds` 同時給時回 400 |
| `EditableArticleRow` | 摘要、遊戲、標籤可編輯並送出正確 payload；逗號輸入不被吞（沿用既有的 `CommaListInput` 測試模式） |
| `TocImageViewer` | 多張切換、無圖時不渲染 |
| `ArticleListClient` | 有／無目錄圖的雙欄與單欄切換；插入列建立文章後進入編輯狀態 |

既有測試會受影響的：`src/__tests__/api/articles-batch.test.ts` 的 409 兩支（連同止血一起移除）、以及 `issue-toc-reviewed` 相關的斷言。

---

## Migration & Compatibility

- **不需要 schema migration**。
- 既有資料不受影響：已有文章的期照常編輯，未複查的期照常出現在待複查清單。
- 正式站 `星際遊樂雜誌 - 1` 的 27 篇重複文章由使用者自行在後台清理，不在本次範圍。
- `OcrResultEditor.tsx` 刪除（711 行）。`BACKLOG.md` 那條「三個檔案超過 650 行」可以少一項。

## Docs

- `docs/features.md`：「複查編輯器」整段重寫，拿掉 2026-08-16 加的 409 說明，改述新流程與手動複查標記。
- `docs/routes.md`：`/admin/ocr` 的職責改為「上傳與辨識」。
