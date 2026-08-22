# Magazine Title（刊名沿革）Design

Date: 2026-08-22

## 問題

`Magazine.name` 是單一字串，一本刊改名之後整段歷史都顯示新名——單期頁會用今天
的名字稱呼 1999 年的那一期（BACKLOG 既有項目）。同時，改了名又各自運行上百期
的時期（電玩通PS2 → 電玩通PLAYSTATION+ → FAMITSU PSP+PS3 TAIWAN），對當年的
讀者就是不同的雜誌，`/magazines` 列表卻只出現一張卡。

已知案例：

| 刊系 | 時期 |
|---|---|
| 電視遊樂雜誌 | ①電視遊樂雜誌 1–292 ②GAME fans 293–300（「電視遊樂快訊」僅試刊號＋第 1 期，入 aliases 不切段） |
| 電視遊樂報導 | ①電視遊樂情報 1–18 ②電視遊樂報導 ③Super Gamer流行電玩週刊（新舊期數並行） |
| 電玩通PS2 | ①電玩通PS2 VOL.1–102 ②電玩通PLAYSTATION+ VOL.103–115 ③FAMITSU PSP+PS3 TAIWAN VOL.116–132（月刊轉季刊不切段） |
| 電腦遊戲世界 | ①電腦遊戲世界 85–162 ②遊戲世界 163–242 |

## 核心決定

**改名不拆刊：`Magazine` 代表整條出版脈絡（lineage），改名以 `MagazineTitle`
（刊名時期）表達。** 「同一個 Magazine」是資料層的歸併判斷，「讀者眼中是幾本
雜誌」是顯示層的決定，兩者不必一致。

歸併與切分的編輯判準收進 `docs/data-conventions.md`（見文末），不進 schema。

## 資料模型

```prisma
model MagazineTitle {
  id         String  @id @default(cuid())
  magazineId String  @map("magazine_id")
  title      String
  // 從這一期起改用此刊名。只存起點：一段的終點就是下一段起點的前一期（按
  // Issue.order），最後一段開放至今，結構上不可能出現縫隙或重疊。
  startIssueId String @unique @map("start_issue_id")
  // 這個時期自己的刊頭；null 時 fallback Magazine.logoImage。改名必然換刊頭，
  // 刊頭本來就是跟著時期走的東西。
  logoImage  String? @map("logo_image")
  // 判定依據與封面照錄，如「封面標示『革新一號（124期）』」。
  note       String? @db.Text

  magazine   Magazine @relation(fields: [magazineId], references: [id], onDelete: Cascade)
  startIssue Issue    @relation(fields: [startIssueId], references: [id], onDelete: Restrict)

  @@index([magazineId])
  @@map("magazine_titles")
}
```

設計要點：

- **邊界綁 Issue 而非日期**：改名是「從某一期起」，且大量期只有月精度甚至沒
  日期。排序的尺是既有的 `Issue.order`（`startIssueId` 只是指標）；reorder 只
  改數值不改相對順序，不受影響。
- **只存起點，不存 end**：起訖期間、涵蓋期數、時期起始日全部推導，不落地，
  沒有一致性問題。
- **`onDelete: Restrict`**：刪除被當作時期起點的期，要先改起點或刪時期——
  默默 cascade 會讓一段沿革無聲消失。
- **不做的**：`change_type` enum、`numbering_restart`、`is_primary`、時期層
  ISSN／頻率／出版社 Period（皆為預先抽象；新舊期數並行已由 `Issue.issueNumber`
  ＋ `altNumbers` 表達；`Magazine.name` 本身就是通行名）。

## 有無 titles 的行為

**只有改名過的雜誌才建 titles；沒改過名的一筆都沒有，行為與現在完全相同。**

- `titles.length === 0`：一切照舊，fallback `magazine.name` / `magazine.logoImage`。
- `titles.length > 0`：編輯慣例是**把整段沿革建齊**（第一筆從第一期起，n 個
  時期 n 筆）。之所以第一段也要建，是因為通行名不一定等於首段名（電視遊樂報導
  的首段叫「電視遊樂情報」），靠 fallback 代打會顯示錯。fallback 邏輯仍保留，
  定位是安全網（沒建齊時不會壞），不是表達手段。

### 對應查法（lib/magazine-title.ts）

給定一本單期：取該雜誌全部 titles（含 `startIssue.order`，一本頂多三五筆），
依 order 排序，找 `startIssue.order <= issue.order` 的最後一筆即當期刊名；
找不到 fallback `magazine.name`。純函式 + 單元測試。

## 顯示行為

### `/magazines` 列表（A 方案）

有 titles 的雜誌展開成**一時期一卡**（grid 與 list 兩種視圖都展開）：

- 卡片刊名＝時期 title；logo＝時期 `logoImage`，null 時 fallback 雜誌 logo。
- 期間與期數從該時期涵蓋的 issues 推導（`publishSort` min/max、筆數）。
- 排序：名稱排序用時期名；創刊日排序用時期起始期的 `publishSort`（首段
  fallback `magazine.foundedSort`），三個時期各落在自己的年代。
- 連結全部進同一個刊系頁：`/magazines/{slug}#period-{n}`（首段不帶錨點）。
- 頁首「共 N 本」計的是展開後的卡數；分類篩選 chips 的計數維持 Magazine 層
  （類別掛在刊系上，展開不改變其歸屬）。

### 刊系頁 `/magazines/[id]`

- 期列表依時期分區段，每段掛 `id="period-{n}"` 錨點、段首顯示該時期刊名與
  期間。**只在預設排序（order asc）下分段**；改排序或篩選後時期會交錯，退回
  平列表。
- 頁首在 aliases 那行的位置補一行刊名沿革（如「電玩通PS2（VOL.1–102）→ …」），
  沒 titles 不顯示。
- structured data 的 `alternateName` 併入各時期 title。

### 單期頁

頁面 h1、breadcrumb、`<title>`／OG 改用該期所屬時期的刊名稱呼。

### 搜尋 `/search`

magazine 搜尋條件加 `titles: { some: { title: { contains: query } } }`，命中
舊刊名導向刊系頁——舊刊名不得成為死路。

## Admin 介面

不動雜誌建立流程與現有表單。`/admin/magazines/[id]` 加「**刊名沿革**」區塊：

- 預設空列表＋「新增時期」按鈕；沒改過名的雜誌編輯永遠不會碰它。
- 每筆欄位：刊名（必填）、起始期（必填，從該雜誌期列表按 order 排的選單）、
  刊頭圖（選填，沿用現有圖片上傳元件）、備註（選填）。
- 選完起始期即時顯示「此時期涵蓋第 X–Y 期」當確認回饋。
- 第一次新增時預帶「`magazine.name`、起始期＝第一期」引導建齊第一段。
- 前提：要先有期資料才能建時期（起點是選既有的期）。

API：`GET/POST /api/magazines/[id]/titles`、`PUT/DELETE /api/magazines/[id]/titles/[titleId]`。
Zod validator 驗證 startIssue 屬於該雜誌；寫入記 EditLog（entityType
"MagazineTitle"）。權限同 magazine 編輯（EDITOR 以上）。

## data-conventions.md 增補

「刊名沿革」一節，收錄：

- **歸併證據強度**（由高至低）：①期號序列延續（尤其新舊期數並行）②出版社／
  發行人相同 ③出版無實質中斷 ④刊物自我宣告（革新號、「原《XX》」）。
  **ISSN 不列入證據**（改名不換號、新刊沿用舊號的違規大量存在；schema 註解
  已記載電擊王與電玩通共用一號）。反向：期號重新起算＋出版中斷＋團隊更迭同時
  成立，即使題名相近仍判兩條刊系。**去重不得單看題名相似度**（「電視遊樂快訊
  ／雜誌」與「電視遊樂情報／報導」是兩條獨立刊系）。
- **切分判準**：正題名語意變動才切段；標點／全半形／異體字差異、副題名增刪、
  純刊期或版型改變不切。短命題名（如僅數期）由編輯判斷入 `aliases` 不切段。

## 不做／已知限制

- 頻率、出版社、價格等其他 Period 化：無實際痛點，不做。
- 時期獨立頁面與 slug（B 方案）：只多一個短網址，不值一階複雜度。
- 1998 新春合併號維持既有決定（單筆掛一本，notes 註明）。

## 測試

- `lib/magazine-title.ts` 對應查法單元測試（空 titles、邊界期、首段前 fallback）。
- validator 測試（startIssue 不屬於該雜誌時拒絕）。
- 既有測試全數通過；lint 通過。
