# Readable URLs (Phase 1: Games & Tags) Design

Date: 2026-08-16

## Overview

`/games/cmsp9xg7l000q04l1nug2zzrz` 看不出是哪一款遊戲。這份設計把公開頁的網址從 cuid 換成 slug，**第一階段只做遊戲與標籤**——那兩個 model 的 `slug` 欄位已經存在且 `@unique`，是投入產出比最好的一段。雜誌、單期、文章留待第二階段，它們需要新增欄位並處理中文期號。

### 動機的修正

BACKLOG 原本把這件事寫成「網址裡的 ID 太長」。**用中文 slug 不會讓網址變短**，實測反而更長：

| 名稱 | 中文 slug（percent-encoded） | 現在的 cuid |
|---|---|---|
| 棒球聯盟 | 36 | 25 |
| 宇宙傳奇II | 38 | 25 |
| 卡門聖地牙哥 | 54 | 25 |

換到的是**可讀、可猜、可分享時看得懂**，不是長度。BACKLOG 那條的敘述要一併改寫，否則日後回顧會以為問題沒解決。

### 為什麼是中文而不是拼音

[Google 的 URL 結構文件](https://developers.google.com/search/docs/crawling-indexing/url-structure)建議非 ASCII 字元 percent-encode，並明講「use words in your audience's language in the URL (and, if applicable, transliterated words)」，文件裡直接給了日文 `ペパーミント` 的例子。音譯是「如果適用」的替代方案，不是首選。這個站 100% 繁中內容、讀者在台灣，中文 slug 正對著這條建議。

[UTS #58](https://www.unicode.org/reports/tr58/) 同樣背書原生文字網址。但它存在的理由本身就是現況的證據：目前各家對含非 ASCII 的網址「可能在不同位置截斷連結，或根本不轉成連結」，瀏覽器複製網址也常吐出 percent-encoded 亂碼。

**這個代價要認**：貼到 LINE／Threads 的純文字會是 `%E5%AE%87%E5%AE%99...`。站上自己輸出的 `<a href>` 永遠正確，連結不會壞，壞的是「看起來像亂碼」與「自動偵測連結的邊界」。想給乾淨英文網址的重點遊戲（`ultima-9`、`system-shock-2`）走既有的手動 slug 欄位，而那批正好就是有 `nameEn` 的西方遊戲。

拼音方案實測後放棄：`pinyin-pro` 與 `tiny-pinyin` 都會在破音字上出錯（`重灌機兵 → zhong-guan`、`單行道`、`樂透` 各錯一邊），且要多一個相依套件。

---

## 現況

**已經到位的比想像多**：

- `Game.slug` 與 `Tag.slug` 都是 `String @unique`（`schema.prisma:204`、`:233`）
- validator 早就允許中文：`/^[a-z0-9\u4e00-\u9fff-]+$/`（`validators/game.ts:8`、`validators/tag.ts:6`）
- **後台已有手動 slug 欄位**（`admin/games/page.tsx:511`），且建立時為必填

**壞的是自動產生那條路**。`resolve-relations.ts` 從 AI 辨識結果建立遊戲/標籤時，slug 補了 13 位時間戳避免碰撞：

```
棒球聯盟 → 棒球聯盟-1786879739750
Battle Chess → battle-chess-1786879504105
```

正式站 **397 款遊戲、162 個標籤，100% 都帶時間戳**。

拿掉時間戳後的碰撞只有兩組，而且都不是真的「同名」：

| 撞的 slug | 實際名稱 | 性質 |
|---|---|---|
| `宇宙傳奇` | 宇宙傳奇**Ⅱ** / 宇宙傳奇**Ⅲ** | slugify 把羅馬數字 Ⅱ／Ⅲ（U+2161/2162）當標點吃掉，兩款是不同續作 |
| `p-47` | P-47 / P.47 | 同一款遊戲的兩種寫法，是重複資料 |

第一組用 NFKC 正規化就解決（`Ⅱ → II`）。第二組是資料品質問題，**不在本次範圍**，已另列 BACKLOG。

---

## Feature 1: slug 產生規則

### 新 module `src/lib/slugify.ts`

```
NFKC 正規化 → 轉小寫 → 保留 a-z0-9 與 CJK，其餘轉 "-" → 收掉頭尾的 "-"
```

`NFKC` 放在最前面，一次處理三類麻煩：羅馬數字（`Ⅱ → II`）、全形英數（`Ｐ－４７ → P-47`）、相容字元（`№5 → No5`）。

```ts
export function slugify(name: string): string
```

空字串是可能的（名稱只有符號時），呼叫端要處理。

### 唯一性

```ts
export async function ensureUniqueSlug(
  tx: TxClient,
  model: "game" | "tag",
  base: string,
  excludeId?: string
): Promise<string>
```

base 沒被佔用就直接用；被佔用就試 `base-2`、`base-3`⋯⋯ 直到空的。`excludeId` 讓更新自己時不會跟自己撞。

**不再使用時間戳**。時間戳保證唯一但讓每個 slug 都不能看，而實測碰撞率是 397 分之 2。

### 接上 resolve-relations

`resolveGameIds` / `resolveTagIds` 建立新資料時改用 `ensureUniqueSlug(tx, "game", slugify(name))`。這是唯一會自動產生 slug 的地方；後台建立時 slug 由人填。

---

## Feature 2: 路由改成吃 slug

### 一個路由，兩種輸入

`/games/[id]` 與 `/tags/[id]` 的動態參數**保持原名不改**，但查詢改成：

```
先用 slug 找 → 找到就正常渲染
找不到 → 用 id 找 → 找到就永久轉址到該筆的 slug 網址
兩個都找不到 → notFound()
```

用 Next.js 的 `permanentRedirect()`（送出 **308**，不是 301——308 保證方法與 body 不變，對 GET 頁面兩者等效，搜尋引擎都視為永久）。這樣舊網址自動轉址，不需要額外的轉址路由或保留欄位——cuid 本來就還在 `id` 欄位裡。搜尋引擎的權重轉得過去，既有連結也不斷。

`generateMetadata` 要用同一套解析，否則 metadata 會在舊網址上查不到資料。抽成共用的 `findGameBySlugOrId(param)`。

**cuid 與 slug 不會誤判**：cuid 是 25 個小寫英數，理論上可以長得像 slug，但先查 slug 再查 id 的順序保證了「slug 存在就贏」，而 slug 是我們自己產的，不會產出 25 碼純英數的字串（除非有人手動填）。這個順序也讓手動改 slug 後舊 slug 自然失效、退回 id 查詢。

### 連結端

公開頁有 7 處在組 `/games/${...id}` 或 `/tags/${...id}`，分佈在四個檔案：

- `(public)/games/page.tsx`
- `(public)/tags/page.tsx`
- `(public)/magazines/[id]/issues/[issueId]/page.tsx`（文章的遊戲/標籤 chip）
- `(public)/search/page.tsx`

全部改成傳 slug。相關 query 要 `select` 出 `slug`——目前多半只取 `id` 與 `name`。

**後台不改**：`/admin/games/[id]` 這類網址不會被分享，維持 cuid，少一份要維護的解析邏輯。

---

## Feature 3: 既有資料回填

一次性 migration script，把 397 + 162 筆的時間戳後綴清掉：

1. 讀出所有 game/tag 的 `id` 與 `name`
2. 以 `slugify(name)` 重算 base
3. 依 `id` 排序穩定地跑一次 `ensureUniqueSlug`，撞到的接 `-2`
4. 寫回

排序要固定（用 `createdAt, id`），否則重跑會把 `-2` 掛到不同一筆上。

**這支腳本要進版控**（`scripts/`），因為 dev 與 production 要各跑一次，而且 [#26] 那條 backlog 已經在抱怨匯入腳本沒進版控。

跑完之後 `宇宙傳奇Ⅱ` 會變成 `宇宙傳奇ii`、`P-47` 與 `P.47` 會變成 `p-47` 與 `p-47-2`——後者正是重複資料被抖出來的地方，交給另一條 backlog 處理。

---

## Testing

| 對象 | 測什麼 |
|---|---|
| `slugify` | NFKC（`宇宙傳奇Ⅱ → 宇宙傳奇ii`、全形 → 半形）、大小寫、標點轉 `-`、收邊、CJK 保留、空字串 |
| `ensureUniqueSlug` | 沒撞就用 base、撞了接 `-2`／`-3`、`excludeId` 不跟自己撞 |
| `resolve-relations` | 新建的 slug 不再帶時間戳 |
| `/games/[id]` · `/tags/[id]` | slug 命中正常渲染、cuid 命中回 308 且 Location 指向 slug、兩者皆無回 404 |
| 回填腳本 | 兩筆同名時第二筆得到 `-2`；重跑結果一致（冪等） |

---

## 不在本次範圍

- **雜誌、單期、文章的網址**（第二階段）。`Magazine` 沒有 `slug` 欄位要新增；`Issue` 的 `issueNumber` 含中文（`創刊號`、`VOL.51`、`70+71`）要另存 URL 安全的 slug，或退而用 `order`。這是比第一階段大得多的一段
- **`P-47` / `P.47` 的合併**（另一條 backlog）
- **後台網址**維持 cuid
- **sitemap**：等網址定案後才有意義，見 backlog

## 相關

- BACKLOG「網址裡的 ID 太長」——動機要改寫（不是長度，是可讀）
- BACKLOG「重複的遊戲條目要合併」——回填時會抖出來
- BACKLOG「sitemap、robots.txt 與 SEO／AEO」——要等網址定案
- BACKLOG「加分享按鈕」——percent-encoding 的代價會在這裡顯現
