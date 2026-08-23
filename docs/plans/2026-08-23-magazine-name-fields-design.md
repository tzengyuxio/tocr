# Magazine 名稱欄位整體規劃 Design

Date: 2026-08-23

## 由來

`2026-08-23-magazine-slug-convention-design.md` 把「刊物自印的拉丁刊名」升格成 slug 規則
的輸入，於是要回答一個問題：《飛訊電玩周刊》封面的 FASHION GAME 該記在哪？

第一版答案是「新增 `nameLatin`」。那個提案不夠好，**它用字母系統當分類軸，而字母系統只是
表象**。真正該分的是**這個名字與這本刊的關係**。

## 現況

### 欄位

| 欄位 | 註解寫的語意 | 實際 |
| --- | --- | --- |
| `Magazine.name` | 刊名 | 創刊時的中文刊名 |
| `Magazine.nameOriginal` | Original name (e.g. Japanese: ファミ通) | **30 本裡只有 1 筆有值**（次世代遊戲情報 = Next Generation），而那筆是並列刊名不是原刊名 |
| `Magazine.aliases` | Other known names (English, historical, etc.) | 8 本有值，混裝五種東西 |
| `MagazineTitle.title` | 刊名時期 | 改名後的先後刊名 |

`Magazine.nameOriginal` 的 trigram 索引叫 `idx_magazines_name_en_trgm`
（`prisma/schema.prisma`），洩漏了它是從 `nameEn` 改名來的。改完之後幾乎沒有資料填得進去
——**欄位語意不對，不是編輯偷懶**。唯一那筆填了東西的（次世代遊戲情報 = Next Generation）
填的還是並列刊名，不是欄位所要的原刊名，等於連那一筆也在證明同一件事。對照 `Game` 至今
仍是 `nameOriginal` 與 `nameEn` 兩欄並存。

### `aliases` 裡實際裝了什麼

八本有值的刊，內容分屬五類：

| 值 | 與本刊的關係 |
| --- | --- |
| Soft World Magazine、The Softworld、Amazing Computer Entertainment、Style Game Magazine、TV.Game Super Guide | 刊物自印的**並列刊名** |
| Computer Gaming World | **原刊**（本刊是它的中文版） |
| 遊戲世界 | **後續刊名**（改名） |
| 任天堂程式解法大公開 | **前身刊名** |
| 法米通、電擊PS | 讀者**俗稱**，刊物沒印過 |
| PC GAMER（`ace`） | 關係不明，待查 |

一個欄位裝五種關係，於是誰也查不出什麼。slug 規範就在這裡踩到坑：因為分不出來，
`gwalker`、`vvkids`、`gtimes` 被誤讀成憑空意譯，直到逐本查封面才發現它們都有出處。

## 核心判斷

**分類軸是「關係」，不是「語言」。** 攤開來看只有四種關係，而且期刊編目學都有現成的名字：

| 關係 | 是什麼 | 例 |
| --- | --- | --- |
| **正題名** | 這本刊的主要刊名 | 電玩通 |
| **並列刊名**（parallel title） | 同一個封面上並列的另一語言刊名，**與正題名同時存在** | TV GAME MAGAZINE、FASHION GAME |
| **後續／前身刊名** | 同一條出版脈絡上的**先後**刊名 | 遊戲世界、任天堂程式解法大公開 |
| **原刊** | **另一本刊**——本刊翻譯或授權自它 | ファミ通、Computer Gaming World |

第四種最容易搞錯，而它正是 `nameOriginal` 空白的原因：**ファミ通 不是《電玩通》的名字，
它是另一本雜誌。** 把它放進「本刊的名稱」欄位是類別錯誤，所以填不下去。

第二種與第三種的差別是**同時 vs 先後**：並列刊名與正題名印在同一個封面上；後續刊名是
改名，舊名此後不再使用。`MagazineTitle` 已經負責第三種。

## 規劃

### 欄位

| 欄位 | 語意 | 型別 |
| --- | --- | --- |
| `Magazine.name` | 正題名。創刊時的中文刊名 | `String` |
| `Magazine.nameParallel` | **並列刊名**。刊物自印、與正題名並列的另一語言刊名，取創刊時的版本 | `String?` |
| `Magazine.sourceTitle` | **原刊刊名**。本刊翻譯或授權自哪一本外刊；空即非翻譯刊 | `String?` |
| `Magazine.aliases` | 其他已知稱呼：俗稱、簡稱、非正式寫法 | `String[]` |
| `MagazineTitle.title` | 該時期的正題名 | `String` |
| `MagazineTitle.titleParallel` | 該時期的並列刊名 | `String?` |

`nameOriginal` 撤掉——它想表達的兩件事分別由 `nameParallel` 與 `sourceTitle` 承接，而它
自己 30 本裡只有 1 筆有值、那筆在新語意下本來就屬於 `nameParallel`，所以是改名不是刪除。

### 幾個決定的理由

**為什麼叫 `nameParallel` 而不是 `nameLatin`／`nameEn`。**
並列刊名不保證是拉丁字母，也不保證是英文——只是這批雜誌恰好都是。用字母系統命名，日後
出現日文並列刊名就沒有家。`parallel title` 是編目學的既有術語，語意精確且可查證。

**為什麼 `sourceTitle` 是字串而不是關聯。**
那些原刊不在庫裡，也不打算收。若日後真要收，再把字串升級成關聯，那時是純新增。

**為什麼 `nameParallel` 是單值。**
比照 `docs/data-conventions.md` 既有的「單值欄位取創刊時的版本」。《軟體世界》光封面就用過
四種寫法——The Softworld、SOFT WORLD MONTHLY、SOFT WORLD MAGAZINE、
COMPUTER SOFT WORLD MAGAZINE MONTHLY——招牌形式（SWM）進 `nameParallel`，其餘進 `aliases`。
和 `name`／`aliases` 同一個模式，不需要新概念。

這本刊也說明**「最完整的形式」是個壞判準**：COMPUTER SOFT WORLD MAGAZINE MONTHLY 最完整，
但沒有人用它稱呼這本雜誌。

**存的是招牌形式，不是最完整的形式。**
《電腦玩家》的 Amazing Computer Entertainment 與《新遊戲時代》的 Style Game Magazine，
刊物自己都是以縮寫 ACE、SGM 當代稱在用。這種情況 `nameParallel` 存 **ACE**、**SGM**，
全名進 `aliases`。

判準是「刊物拿哪個形式當識別」，不是「哪個形式最完整」。**出處的證據不限於封面刊頭**：
封面上的小 logo、官方網域（《軟體世界》是 swm.com.tw）、版權頁、社論自稱都算，
而且網域這種證據往往比封面更明確——它是刊物自己選的識別。這樣做有個具體好處：**slug 規則 1
因此可以是純機械的**——直接讀 `nameParallel` 去體裁尾綴取首末詞，不必再判斷「這本刊是不是
以縮寫為招牌」。判斷前移到錄入，規則保持純函數。

**官方縮寫不是另一種關係。** ACE 之於 Amazing Computer Entertainment 是同一個並列刊名的
長短兩種形式，不需要 `nameAbbr` 這種欄位。讀者俗稱（法米通、電擊PS）才是另一回事，
那些留在 `aliases`。

**為什麼 `MagazineTitle` 也要 `titleParallel`。**
並列刊名會跟著改名一起換（電視遊樂雜誌的 TV GAME MAGAZINE 後來變成 GAME fans）。
`Magazine` 存創刊值、`MagazineTitle` 存各時期值，這個分工在 `title` 上已經成立，
`titleParallel` 只是照抄，不引入新結構。

**為什麼不做一張 `MagazineName` 表。**
`(magazineId, name, type, isPrimary)` 看起來更通用，但 `MagazineTitle` 已經負責時間軸，
再加一張名字表就有兩套真相；而且 `name` 本身是欄位，查詢與表單會出現三處重疊。四種關係
是封閉的、不會再長出第五種，用固定欄位表達更省。

### 與 slug 規則的對應

規劃之後，slug 規則的優先序恰好就是欄位的判定順序——這是這個切分正確的旁證：

| 欄位 | slug 規則 |
| --- | --- |
| `nameParallel` 有值 | 規則 1：並列刊名去體裁尾綴，照錄剩下的詞 |
| 否則 `sourceTitle` 有值 | 規則 2：原刊識別 + `-tw` |
| 皆無 | 規則 3：`name` 的漢語拼音（保底） |

**順序是 `nameParallel` 先於 `sourceTitle`。這一版是修正過的**——原本寫成反過來，理由是
「翻譯刊也可能自印並列刊名，但它的識別應該跟著原刊走」。那句話錯了，《勝利小子》就是反例。

它是集英社《Vジャンプ》的台灣中文版，但封底印的並列刊名是 **V. V. KIDS**，母刊叫
**V Jump**。**V. V. KIDS 不是 V Jump**——它只借了那個 V，名字是台灣版自己取的。所以它有
`sourceTitle`（那是事實），slug 卻該走 `nameParallel`。

翻轉之後，十本授權版的答案一個都沒變，因為它們的 `nameParallel` **本來就是空的**：

| 台灣版封面的拉丁字 | 母刊 | 是不是同一個 |
| --- | --- | --- |
| 電撃PlayStation | 電撃PlayStation | 是 → `nameParallel` 空 |
| ファミ通 | ファミ通 | 是 → 空 |
| NEXT | Next Generation | 母刊的 wordmark → 空 |
| （無英文） | ファミコンMagazine | — → 空 |
| **V. V. KIDS** | **Vジャンプ** | **否 → 有值** |

所以錄入時真正要問的不是「它是不是翻譯刊」，而是**「封面上這個拉丁字，是母刊的標識，
還是這本刊自己取的？」**——那有證據可查（跟母刊刊名比對）。判斷落在錄入時，規則本身
保持純函數，與「招牌形式 vs 最完整形式」是同一個位置。

### 現有資料怎麼歸位

| 刊 | `nameParallel` | `sourceTitle` | `aliases` 保留 |
| --- | --- | --- | --- |
| 勝利小子 | V. V. KIDS | Vジャンプ | — |
| 軟體世界雜誌 | SWM | — | The Softworld、SOFT WORLD MONTHLY、SOFT WORLD MAGAZINE、COMPUTER SOFT WORLD MAGAZINE MONTHLY |
| 電腦玩家雜誌 | ACE | — | Amazing Computer Entertainment、PC GAMER、PC GAMER 國際中文版 |
| 新遊戲時代雜誌 | SGM | — | Style Game Magazine |
| 攻略快報 | TV.GAME SUPER GUIDE | — | — |
| 電腦遊戲世界 | — | Computer Gaming World | —（「遊戲世界」轉入 `MagazineTitle`） |
| 電玩通 | — | ファミ通 | 法米通 |
| 電擊PlayStation | — | 電撃PlayStation | 電擊PS |
| 華泰任天堂秘笈 | — | ファミリーコンピュータ Magazine | —（「任天堂程式解法大公開」轉入 `MagazineTitle`） |
| 次世代遊戲情報 | — | Next Generation | NEXT GENERATION |

加上 slug 規範過程中查封面新得到的：TV GAME MAGAZINE、TV.GAME REPORT、TV GAME
INFORMATION、GAME TIMES、GAME WALKER、GAME FACTORY、Games People、Game Developer、
RETRO GAME TIME、FASHION GAME、SOFTSTAR MAGAZINE、WOLF Weekly、ASTRO、
e-Generation Weekly、Victory Boy、CITY BOY、GAMEXPRESS、SG Game Weekly。

## 壓力測試：電腦玩家

這一本把上面的規劃壓出三個問題，其中一個是實質缺陷。封面沿革：

| 期 | 封面 |
| --- | --- |
| 創刊 | 電腦玩家 + Amazing Computer Entertainment（縮寫 ACE） |
| ~48（1995-07）起 | 加上「PC GAMER 國際中文版」；此前後取得 PC GAMER 的文章授權 |
| ~63–64 | Amazing Computer Entertainment 從封面消失 |
| 96 | 「PC GAMER 國際中文版」改為「PC GAMER」，與「電腦玩家」並列 |
| 109–111 | PC GAMER 成為主標題字，「電腦玩家」縮小置於其上 |
| 112 起 | 「電腦玩家」恢復主標；PC GAMER 時有時無 |

### 一、並列刊名的變動不與改名同步（實質缺陷）

正題名「電腦玩家」從頭到尾沒變，但並列刊名換了三輪：ACE（創刊–63）→ 無（64–95）→
PC GAMER（96–）。`MagazineTitle` 的切段判準是**正題名改變**，所以這三段不會切出時期，
`titleParallel` 掛在 `MagazineTitle` 上就表達不了。

**修法是降級，不是升級。** 不為封面標示的演變建結構：

- `nameParallel` 單值取創刊值 → Amazing Computer Entertainment
- 其餘寫法（PC GAMER、PC GAMER 國際中文版）進 `aliases`，維持可搜尋
- 沿革敘述進 `description`

理由是 `nameParallel` 的三個用途——slug 規則的輸入、搜尋、列表副標——**都只需要一個代表值
加一組可搜尋的其他值，不需要精確的期數區間**。而「哪一期封面長什麼樣」已經有家：
`MagazineTitle.note`（封面照錄）與每一期的封面圖本身。

這也與 `docs/data-conventions.md` 既有的處理一致：`publisher` 換過就取創刊值、變動寫進
`description`。同一個原則，不必為名稱另立一套。

`MagazineTitle.titleParallel` 仍然保留，但適用範圍收窄成**跟著改名一起換**的那種
（電視遊樂雜誌 TV GAME MAGAZINE → GAME fans，與正題名同時改，切段判準相同）。分工是：

| 情況 | 記在哪 |
| --- | --- |
| 並列刊名隨正題名改名一起換 | `MagazineTitle.titleParallel` |
| 正題名沒變、並列刊名自己在變 | `nameParallel`（創刊值）+ `aliases` + `description` |

### 二、`sourceTitle` 不能用「有沒有授權」判定

《電腦玩家》取得的是 **PC GAMER 的文章授權**，不是整刊翻譯；它有自己的編輯部與大量原創
內容。若把 PC GAMER 填進 `sourceTitle`，slug 規則 2 會算出 `pcgamer-tw`，而這本刊的識別
明明是 ACE／電腦玩家。

所以 `sourceTitle` 的語意要寫死：**記的是「本刊整體即該外刊的中文版」**，判準是刊物是否
以該外刊的識別作為自己的識別。《電玩通》整本就是ファミ通的台灣版，填；《電腦玩家》不是，
不填。文章授權關係寫進 `description`，不建欄位——只有這一個案例，也沒有查詢需求。

麻煩的是這本刊自稱過「PC GAMER 國際中文版」。**這證明二元欄位不夠，需要的是判斷準則而
不是機械規則**：看的是刊物的識別重心在哪，不是封面上有沒有出現那個名字。

### 三、109–111 期的主副易位不切段

那三期 PC GAMER 是主標題字、「電腦玩家」縮小置上，112 期又換回來。依
`2026-08-22-magazine-title-design.md` 的判準（讀者眼中是不是不同的雜誌），三期的版面
主副易位不構成刊名時期，照錄進 `note` 即可。**版面權重不是刊名。**

### 對 slug 的影響：沒有

`nameParallel` 取創刊值 Amazing Computer Entertainment，封面即以 ACE 為品牌，走規則 1
得到 `ace`——與現行值相同，不受 PC GAMER 的任何變動影響。這正是「錨定創刊名」
（slug 規範元規則 B）要買的穩定性。

## 影響範圍

`Magazine.nameOriginal` 目前有讀取的地方：`MagazineForm.tsx`（表單「原文名稱」欄）、
`MagazineListClient.tsx` 與 `MagazineList.tsx`（列表副標）、`magazine-browse.ts`（型別與
select）、`ImportPreviewTable.tsx`。**全部 30 筆為空**，所以改欄位不動資料，只動這幾處
的欄位名與標籤。

`Game.nameOriginal`／`Game.nameEn` 不在本次範圍內。遊戲的「原文名」與「英文名」是不是同一組
問題，要另外判斷——遊戲沒有並列刊名這個概念，不能照抄。

## 未決

- **「本刊整體即該外刊的中文版」需要更多案例來校準**。目前只有電玩通系與電擊系是明確的
  「是」，電腦玩家是明確的「不是」，中間地帶尚未遇到
- **`nameParallel` 要不要進搜尋**。`Magazine` 目前有 `name` 與 `nameOriginal` 兩個 trigram
  索引，後者對應的資料全空。若 `nameParallel` 填起來，索引應該跟著換過去
- **並列刊名的大小寫照錄與否**。封面是 TV GAME MAGAZINE、Games People、
  TV.Game Super Guide，寫法不一。傾向照錄，顯示時再決定，但要明文寫進 data-conventions
