---
status: open
created: 2026-09-20
---

# `Game.platforms` 的平台代號表

`Game.platforms` 是自由字串陣列，6,744 筆**全空**——等於一張白紙，寫進去的第一批值
就是往後的慣例。這份先把代號定下來，再談怎麼批次寫入。

## 為什麼不能照抄 PLATFORM 標籤

站上已有 46 個 `PLATFORM` 標籤，但它自己就沒有收斂過：

    FC/紅白機(197)      紅白機(1)                        同一個平台兩種寫法
    SFC(55)            SFC/超任(50)      超級任天堂(1)    三種
    PC Engine(65)      PCE/PC Engine(12)                 兩種
    MD/Mega Drive(30)  MegaDrive(1)                      兩種
    XBOX(6)            Xbox 360(114)                     這兩個是不同主機，不是寫法差異
    CD-ROM(10) 光碟(2) DVD(1) MegaDisc(1) DDR(1)         **根本不是平台**

標籤那邊的清理是另一條事（見 [series-tag-cleanup.md](series-tag-cleanup.md) 的同類問題），
但兩邊該用同一張代號表——否則同一款遊戲的平台，在標籤與欄位上會長出兩種寫法。

## 三份來源

| 來源 | 值的樣子 | 涵蓋 |
| --- | --- | --- |
| 站上 `PLATFORM` 標籤 | 最亂，含斜線別名與非平台值 | 46 個值 |
| cdosgame `platform_note` | 粒度最細：`DOS`／`Win3.1`／`Win9x`／`WinXP`／`Win64`／`DOS/V` | 1,592 筆對得到站上 |
| `data/famitsu-game-index.csv` `platform_tag` | 最乾淨，轉錄時已正規化 | 獨立對到站上 393 筆 |

## 提案：代號

純代號，**不帶斜線、不帶中文別名**。中文顯示名是前台的事，不進資料。

### 任天堂

| 代號 | 平台 | 現有值 |
| --- | --- | --- |
| `FC` | Family Computer／紅白機 | `FC/紅白機`、`紅白機` |
| `SFC` | Super Famicom | `SFC`、`SFC/超任`、`超級任天堂` |
| `N64` | NINTENDO 64 | `N64` |
| `GC` | GameCube | `GC` |
| `WII` | Wii | `Wii` |
| `WIIU` | Wii U | `Wii U`、`WiiU` |
| `GB` | Game Boy | `GB` |
| `GBA` | Game Boy Advance | `GBA` |
| `NDS` | Nintendo DS | `NDS`、`NINTENDO DS` |
| `3DS` | Nintendo 3DS | `3DS`、`NINTENDO 3DS` |

### 索尼

| 代號 | 平台 | 現有值 |
| --- | --- | --- |
| `PS` | PlayStation | `PS`、`PlayStation` |
| `PS2` / `PS3` / `PS4` | | `PS2`、`PS3`／`PLAYSTATION3`、`PS4` |
| `PSP` | PlayStation Portable | `PSP`、`PlayStation Portable` |
| `PSV` | PlayStation Vita | `PS Vita`、`PlayStation Vita` |

### 世嘉

| 代號 | 平台 | 現有值 |
| --- | --- | --- |
| `MD` | Mega Drive | `MD/Mega Drive`、`MegaDrive` |
| `MCD` | Mega-CD | `Mega-CD` |
| `SS` | Saturn | `SS`、`Sega Saturn` |
| `DC` | Dreamcast | `DC` |
| `SMS` | Master System | `SMS/Master System` |
| `GG` | Game Gear | `GG/Game Gear` |

### 微軟

| 代號 | 平台 | 現有值 |
| --- | --- | --- |
| `XBOX` | Xbox（初代） | `XBOX` |
| `X360` | Xbox 360 | `Xbox 360` |
| `XONE` | Xbox One | `Xbox One` |

**`XBOX` 與 `Xbox 360` 是兩台主機**，現有標籤把它們並列不是寫法問題。初代那 6 筆要
逐篇看是講哪一台。

### 其他主機與大型機台

| 代號 | 平台 | 現有值 |
| --- | --- | --- |
| `PCE` | PC Engine | `PC Engine`、`PCE/PC Engine` |
| `NG` | NEOGEO | `NEOGEO` |
| `NGP` | NEOGEO POCKET | `NEOGEO POCKET` |
| `ARCADE` | 大型電玩 | `Arcade`、`大型電玩` |

### 電腦

| 代號 | 平台 | 現有值 |
| --- | --- | --- |
| `DOS` | MS-DOS | `DOS`、`DOS/V` |
| `WIN` | Windows | `Windows`、`Win3.1`、`Win9x`、`WinXP`、`Win64` |
| `PC98` | PC-98 | `PC-98` |
| `APPLE2` | Apple II | `Apple II` |
| `PC` | 泛稱，分不出是哪一種時 | `PC`、`PC/個人電腦` |

### 行動裝置與掌上裝置

| 代號 | 平台 | 現有值 |
| --- | --- | --- |
| `IOS` | | `iOS` |
| `ANDROID` | | `Android` |
| `PALM` | Palm OS 掌上裝置 | 站上還沒有 |

`手機遊戲(1)` 太籠統——那個年代可能是 feature phone、也可能是 iOS/Android，要看文章。

`PALM` 與 `IOS`／`ANDROID` 同一族但差了一個世代：Palm 的遊戲在台灣雜誌上出現的時間
大約是 1999–2005，載體是 PDA 不是手機。歸在同一族是因為讀者的分類直覺（「不是主機也
不是電腦的隨身裝置」），不是因為技術系譜。

### 網頁

| 代號 | 平台 | 現有值 |
| --- | --- | --- |
| `WEB` | 瀏覽器上跑的遊戲 | 站上還沒有 |

**自成一族，不併進 PC**。網頁遊戲跨裝置（同一款在電腦與手機的瀏覽器都跑得動），
併進 `PC` 家族會讓「這款要有電腦才能玩」這個前提變成錯的。Flash、Java applet、
HTML5 都算，不細分——載體的世代差異對雜誌索引沒有意義。

### 不是平台，不要映射

`CD-ROM`、`光碟`、`DVD`、`DDR`、`MegaDisc`。前三個是載體（同一款遊戲的磁片版與光碟版
是同一個平台的兩種版本，見 data-conventions 的「重複條目怎麼歸類」），`DDR` 是遊戲名。

`MegaDisc` **推測是某本雜誌附送光碟的名稱**（yuxio 2026-09-20 的推測，還沒查證）。
真是這樣的話它連載體都不是，是贈品——處理前要看那一篇文章實際在講什麼，別照推測
就併進 `MCD`。

## 顯示用的家族

代號存細的，**顯示與篩選時收斂**。一張常數表就夠，不需要欄位：

    PC 家族    DOS, WIN, PC98, APPLE2, PC
    任天堂      FC, SFC, N64, GC, WII, WIIU, GB, GBA, NDS, 3DS
    隨身裝置    IOS, ANDROID, PALM
    網頁        WEB
    ...

## 已定案：存細的，顯示粗的（yuxio 2026-09-20）

**對 TOCR 而言只要 `PC` 就夠**——站上的雜誌索引沒有人會想篩「Win9x 的遊戲」。
但這批細粒度的值來自 cdosgame，而長期目標是**建一個遊戲／雜誌／遊戲書籍的統一資料庫，
再由它產生 tocr／cdosgame／nostalib 三站需要的資料**，統一庫會需要細的。

**做法：存細的（`DOS`／`WIN`／`PC98`／`APPLE2`），前台顯示與篩選時用上面的家族表收斂成
「PC」。** 三個理由：

1. **成本幾乎是零**：一張常數表，不是欄位、不是 migration。而反過來——現在壓成 `PC`、
   將來統一庫要細的——就得重跑一次匯入，那時候 cdosgame 的資料未必還是今天這份
2. **有損壓縮沒有回頭路**：TOCR 自己也會從雜誌目錄長出平台資訊（1990 年代台灣雜誌偶爾
   會寫明「DOS 版」）。那種是 cdosgame 沒有的，壓掉就真的沒了
3. **符合「逐步收集」的做法**：現在正在做的事本來就是替統一庫累積素材，素材階段保留
   粒度、輸出階段再收斂，是慣常的順序

反對的理由也要記下來：**平台是從 cdosgame 鏡像來的，等於同一份資料兩處都有**，cdosgame
改了 TOCR 不會知道。這條靠 `ExternalLink` 的 `cdg_id` 緩解——對照關係存著，要重新同步
隨時跑得動。

## 動手的順序

1. 代號表定案，寫進 [data-conventions.md](../data-conventions.md)
2. `scripts/suggest-platforms.ts`：把 cdosgame 的 1,592 列與 famitsu 的 393 筆合成一份
   寫入前的提案表（**只出表不寫庫**，與 `match-cdosgame.ts` 同樣理由）
3. 人審過後批次寫入，走 API 不走 SQL
4. PLATFORM 標籤照同一張代號表收斂（另一條，但同一張表）
