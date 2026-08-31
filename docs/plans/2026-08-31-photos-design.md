# 額外圖片（Photo）Design

Date: 2026-08-31

## 由來

站上目前的圖各有固定用途：`Magazine.logoImage` 與 `MagazineTitle.logoImage` 是刊頭，
`Issue.coverImage` 是封面，`Issue.tocImages` 是目錄頁掃描，`Magazine.photos` 是自己
收藏的實體照。這些都預設「圖來自本站藏品」。

但有一類圖不是：網路上看到人分享的、網拍商品頁截下來的。它們的用處有三種——

1. 就是一張值得留著的圖
2. **佐證某一期存在過**，例如確定一本刊的最末期與時間
3. **補既有實體的不足**，例如同一期的另一版封面

這三種的共同點是**來源不是本站**，而現有欄位沒有一格記得住來源，也分不出哪些圖
還沒確認來路、不該公開。

## 決定

新增一張 `Photo` 表，同時接手 `Magazine.photos`。

### 掛點：雜誌或單期，二擇一

不掛 `MagazineTitle`：時期的歸屬可以由「哪本刊 + 哪一期」算出來，存了是多的，
也會讓那個目前職責很窄的 model 再長一層責任。

**指向「尚未建檔的期」的圖，不給自由文字指向欄位。** 圖上讀得出期號或日期的，
先建一筆只有期號的 stub `Issue`，圖掛上去；讀不出來的（一疊書背、模糊的攤位照）
掛雜誌，推測寫進 caption。

理由：自由指向欄位查不了也排不了——那正是 `docs/backlog/masthead-evolution.md`
裡三種形狀共同的死因；而且真的建了那期之後要人工回頭搬圖，等於需要額外的介面。
建成 stub Issue 則讓「這本最末期是哪一期」變成 `order` / `publishSort` 查得出的
事實，之後拿到實體本只是補欄位，圖不用搬、網址不會變。

代價要認：`issueNumber` 必填且 `@@unique([magazineId, issueNumber])`，猜錯會佔住
名字。所以判準是**圖上讀不讀得出來**，讀不出來就不硬編一個看起來像真值的期號。

那筆 stub 不需要「這是推測期」的旗標：封面空、文章空、底下掛著一張標了來源的
佐證圖，已經說完了。

### 不做的事

- **不加圖片類型 enum**（收藏照／佐證／補充封面）：類型由「掛在哪」加 caption
  說得完，站上也沒有任何地方要按類型篩選
- **不記授權**

## 資料模型

```prisma
model Photo {
  id         String   @id @default(cuid())
  // 二擇一：掛雜誌或掛單期。Prisma 表達不了 XOR，CHECK 寫在 migration 裡。
  magazineId String?  @map("magazine_id")
  issueId    String?  @map("issue_id")

  url        String
  // 可空：Magazine.photos 遷進來的一批本來就沒有說明；也是「看不出期號的圖」
  // 寫推測的地方。
  caption    String?  @db.Text
  // 來源：網拍站名、論壇文章標題、分享者代號⋯⋯純文字，因為它們沒有共同結構。
  // 兩欄都空＝本站藏品，公開頁就不標來源。
  sourceName String?  @map("source_name")
  sourceUrl  String?  @map("source_url")
  // 讀者看不看得到。新上傳的多半來路還沒確認，預設藏起來。
  isPublic   Boolean  @default(false) @map("is_public")
  order      Int      @default(0)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  magazine Magazine? @relation(fields: [magazineId], references: [id], onDelete: Cascade)
  issue    Issue?    @relation(fields: [issueId], references: [id], onDelete: Cascade)

  @@index([magazineId, order])
  @@index([issueId, order])
  @@map("photos")
}
```

名字叫 `Photo` 不叫 `MagazineImage`：它同時掛得到單期，前綴會騙人；`Image` 又太泛
——`logoImage` / `coverImage` / `tocImages` 都是圖但都不進這張表。

`onDelete: Cascade`：雜誌或單期刪掉，圖沒有歸屬。Blob 上的檔不會跟著刪，與現在
`coverImage` 的行為一致（`scripts/find-orphan-blobs.ts` 本來就在收這種尾）。

## 遷移

一支 SQL migration 做完：建表、加 CHECK、搬資料、砍欄位。

```sql
ALTER TABLE photos ADD CONSTRAINT photos_one_owner
  CHECK ((magazine_id IS NULL) <> (issue_id IS NULL));

INSERT INTO photos (id, magazine_id, url, is_public, "order", created_at, updated_at)
SELECT ..., m.id, p.url, true, p.ord - 1, now(), now()
FROM magazines m, unnest(m.photos) WITH ORDINALITY AS p(url, ord);

ALTER TABLE magazines DROP COLUMN photos;
```

`WITH ORDINALITY` 讓陣列原本的順序直接變成 `order`，搬完顯示順序不變。
`is_public = true`：這批現在就在刊系頁上，遷移不該悄悄把它們藏起來。

跟著改的地方（`photos` 目前被讀到的六處）：`lib/magazine-gallery.ts` 的入參、
公開頁與後台頁的 `select`、`lib/validators/magazine.ts`、`MagazineForm.tsx`，
以及對應測試。

### CSV 匯出

**拿掉 `photos` 欄，`Photo` 歸進 `export-schema-coverage.test.ts` 的待決類。**

理由與 `CSV_HEADERS` 註解裡排除 `MagazineTitle` / `MagazineSlug` 的那條相同：CSV 是
雜誌／單期／文章三層的扁平格式，一本刊有幾張圖跟它有幾期無關；何況一張圖有五個值，
`;` 串接的單欄裝不下。

**這是備份保真度的淨損失**，`photos` 的 url 原本備份得到，改完備份不到。歸「待決」
而非「豁免」就是為了留下這個痕跡——等關聯資料的匯出成形（`MagazineTitle` 也還在等
同一件事）一起解，不為圖片單獨長出第二種匯出格式。

## 後台

**新元件 `PhotoManager`，不動 `MultiImageUpload`。** 後者只認 `string[]`，而
`IssueForm` 的目錄頁掃描圖也在用它；把四個欄位塞進去會讓目錄頁白背包袱。上傳流程
複用（`downscaleImage` → `/api/upload`，folder 用 `photos`），差別是上傳完建一筆
`Photo`，底下跟著 caption、來源名、來源網址、公開開關，加上上／下移一格的排序（實作時改的：一個掛點通常只有幾張，拖曳的機械成本換不到什麼）。

**存檔走獨立的 `/api/photos` CRUD，不併進表單送出。** `Photo` 掛得到兩種對象，走
表單就要在 `MagazineForm` 和 `IssueForm` 各寫一份陣列 diff。權限沿用
`requireEditor`；每次寫入留 `EditLog`（`entityType: "Photo"`、`entityId` 是圖的
id、`changes` 記改了哪幾欄），這樣「誰加了這張網拍圖、來源填了什麼」查得到。

兩個代價：

- **即時生效，沒有「取消」**——與 TOC 編輯的手感一致
- **新建頁沒有 id，貼不了圖**——圖片區塊只在編輯既有雜誌／單期時出現

位置：雜誌與單期的後台編輯頁各多一個「圖片」區塊，接在現有欄位之後。
`MagazineForm` 原本的「藏書照」欄位移除，由這個區塊接手。

## 公開顯示

**過濾在查詢層**：公開頁一律 `where: { isPublic: true }`。UI 過濾會讓未公開的 url
隨 payload 送到瀏覽器，等於沒藏。後台兩種都列，未公開的加標記。

**刊系頁**：位置不變（刊頭之後）。note 現在硬寫「藏書照」，改成
`caption ?? sourceName ?? "藏書照"`——沒有來源就是本站藏品，這條 fallback 讓遷移
過來的舊資料顯示完全不變。

**單期頁**：封面與目錄頁圖之後多一個區塊，放掛在該期的圖。

**來源標示**：有 `sourceUrl` 就把來源名做成連結（`rel="nofollow noopener"`），只有
名字就是純文字，兩欄皆空什麼都不標——這就是「本站藏品」與「外部來源」的視覺區分。

## 注意事項

**外部圖一律轉存自家 Blob，不熱連原網址。** `MultiImageUpload` 現有的「輸入圖片
網址」直接存字串，對網拍圖不能用：商品下架連結就死，而佐證圖的意義是它得留得住。

代價是撞 Vercel Blob 的 Advanced Operations 額度（30 天滾動窗口），BACKLOG 已經
因此卡住十幾張封面。程式解不了這題，**批次補圖前先看用量，一次一小批**。
