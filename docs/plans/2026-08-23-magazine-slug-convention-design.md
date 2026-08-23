# Magazine Slug 命名規範 Design

Date: 2026-08-23

## 這份文件的範圍

只談**規則本身**：一本雜誌的 slug 該怎麼決定。不談既有 slug 要不要改、怎麼改、改了
誰會壞——那些是另一個題目。文末的對照表是**規則的驗證用例**，不是遷移清單。

規則若被採納，正式的落點是 `docs/data-conventions.md`；這裡是推導過程。

## 現況

`Magazine.slug` 目前是純手填（`src/components/magazine/MagazineForm.tsx:144`，
placeholder 寫 `fmt-tw`），validator 只檢查 `^[a-z0-9-]+$`
（`src/lib/validators/magazine.ts`）。值繼承自 nostalibrary，新刊由編輯自行發明。

34 本刊分成五種風格：

| 風格 | 例子 |
| --- | --- |
| 刊物自印的拉丁名／品牌，原樣採用 | `swm`、`ace`、`sgm`、`mania`、`oxm`、`cgw`、`next`、`fashion`、`wolf` |
| 自印拉丁名的**自造縮寫** | `tvgsg`、`ssm`、`rgt`、`vboy`、`egen`、`astro`、`gd`、`gf`、`gpeople`、`gwalker`、`vvkids`、`gtimes`、`tvgameinfo`、`tvgm`、`tvgr` |
| 日刊縮寫 + `-tw` | `fmt-tw`、`dps-tw`、`dss-tw`、`doh-tw`、`hps-tw`、`fmtps-tw` |
| 中文刊名的縮寫或意譯 | `jxdn`、`htntd`、`game100` |
| 意象式取名 | `newgen`（待查） |

第一種比看起來多：`data/magazines.json` 的 `aliases` 記著
`ace` = Amazing Computer Entertainment、`swm` = Soft World Magazine、
`sgm` = Style Game Magazine（SGM 與 ACE 一樣是刊物自用的代稱）、
`tvgsg` = TV.Game Super Guide；《舊遊戲時代》封面刊頭印的是
RETRO GAME TIME。逐本查封面之後，自印英文名的數量遠超過 `aliases` 記載的：《遊戲設計大師》
Game Developer、《遊戲工場》GAME FACTORY、《電玩族》Games People、《電遊人》GAME WALKER、
《次世代遊戲情報》NEXT GENERATION、《勝利小子》V KIDS、《電玩時代》GAME TIMES、
《電遊通訊》TV GAME INFORMATION、《電視遊樂雜誌》TV GAME MAGAZINE、
《電視遊樂報導》TV.GAME REPORT、《飛訊電玩周刊》FASHION GAME、《軟體之星》SOFTSTAR MAGAZINE、
《疾風快報》WOLF Weekly、《勝利少年》Victory Boy、《電玩e世代》e-Generation Weekly、
《星際遊樂雜誌》ASTRO TV GAMES MAGAZINE。

這改變了對現況的判讀：`gd`、`gf`、`gpeople`、`gwalker`、`vvkids`、`rgt`、`gtimes`、
`tvgameinfo`、`tvgm`、`tvgr` 不是憑空意譯，
**它們是自印英文名的自造縮寫**——名字有出處，縮法沒有。`next` 更直接，它就是
NEXT GENERATION 的首詞。

盤點時要留意：**「有沒有自印拉丁刊名」不能靠 `aliases` 判斷**，那個欄位本來就沒填全。
判斷的依據是封面與刊頭，資料庫只是它的（不完整）紀錄。

## 語料告訴我們的五件事

事後諸葛的優勢：規則可以先驗地拿全量語料驗證，而不是猜。

**1. 區別性在刊名後半段，不在前半段。**
「電玩」開頭 6 本、「遊戲」3 本、「電腦」2 本、「電視遊樂」2 本、「電遊」2 本、
「勝利」2 本。任何「取前 N 字」的規則在這份語料上必撞。

**2. 體裁尾綴大量存在且無區別力，但界線必須是封閉清單。**
「雜誌」×4、「週刊」×2 可丟；「報導」「快報」「通訊」「情報」「秘笈」不可丟——
《電視遊樂報導》丟掉「報導」就跟《電視遊樂雜誌》撞。

**3. 刊名混拉丁字母與數字。**
PlayStation、SEGA SATURN、PS2、3DO、HYPER、e世代、百分百。規則必須說明混合刊名逐段
怎麼處理，以及 `3DO` 開頭是數字。

**4. 三分之一是翻譯刊或國際版。**
電擊系、電玩通系、HYPER PS、OXM、電腦遊戲世界（Computer Gaming World）、
華泰任天堂秘笈。這些刊有中文原生刊沒有的資產：原刊已經有現成、而且讀者認得的識別。

**5. 改名是常態。**
電擊王→DengekiGAMES、電視遊樂雜誌→GAME fans、電玩通PS2 的三個刊名時期
（見 `2026-08-22-magazine-title-design.md`）。規則必須指定 slug 錨在哪個名字上。

## 三條元規則

比選哪種命名風格更重要。

**A. slug 生成函數只吃這本刊自己的名字，不吃資料庫現況。**
一旦規則長成「取到能區別為止」或「撞到就自動接 `-2`」，新增第 35 本刊就可能迫使既有
的某本改名。純函數才讓 slug 可預測、可離線推導、可寫進測試。撞名交由人工加限定詞，
且**加後綴的一定是後來的那本**。

（同樣的判斷已經出現在 `Issue.slug`：`@@unique([magazineId, slug])` 撞到時報錯要人取名，
不自動接 `-2`。這裡只是把它提升成雜誌層的通則。）

**B. slug 錨定創刊名。**
與 `docs/data-conventions.md` 既有的「`publisher` 取創刊時的值」「`foundedDate` 以創刊號
為準」同一個時間切面。改名後的刊名進 `aliases` / `MagazineTitle`，不動 slug。否則
《電擊王》要在 `dengeki-oh` 與 `dengekigames` 之間選，選哪個都會讓另一半的期數看起來
不屬於這本刊。

**C. 只要求單向可推導，不要求可反推。**
「給刊名能算出 slug」是必要的——它讓建檔時不必發明，也讓規則能寫成測試。
「從 slug 猜回刊名」則不必要：雜誌頁上有中文全名，搜尋有 trigram 索引，可讀性有別的
地方負責。

這條放寬買到一件具體的事：**規則可以合法地丟詞**。只要「丟哪個詞」本身是確定的，
`次世代遊戲情報 → cishidai-qingbao` 就是合格的 slug，不必因為「反推不出遊戲」而排斥它。
下面規則 3 的「首詞 + 末詞」正是靠這條才成立。

## 參差不齊從哪裡來

直覺上會覺得現況這份清單很亂，但**亂的不是長度**。現行 34 個 slug 的長度標準差只有
1.8、全距 8，在四個方案裡最集中。

真正的分界是**有沒有出處**。現行 34 個裡，整個值都能指回刊物印過的東西的有 9 個
（`swm`、`ace`、`sgm`、`mania`、`oxm`、`cgw`、`next`、`fashion`、`wolf`）；其餘 25 個都
經過編輯加工——`tvgsg`、`ssm`、`vboy`、`egen`、`astro`、`gd`、`gf`、`gpeople`、`gwalker`、`vvkids`、`rgt`、`gtimes`、
`tvgameinfo`、`tvgm`、`tvgr` 把自印拉丁名縮掉，`jxdn`、`htntd` 把中文名縮掉，只剩 `newgen` 尚未查證。
**同一本刊換一個編輯就會得到不同的值**，這才是亂的來源。

`gwalker` 特別能說明問題：GAME WALKER 有出處，`gwalker` 這個縮法沒有。名字對了、造詞法
是自創的，於是別人重做一次不會得到同一個值。

「念不出來」是它的常見副作用而不是本體：`gwalker`、`gpeople`、`vboy` 念得出來，一樣是
自造，一樣無從推導。反過來 `ace`、`ps`、`ss` 念不出來或念得勉強，卻毫無問題——因為刊物
自己就是這樣印的。

所以判準是**出處**，不是形狀，更不是好不好念。

## 設計：語源自由，形狀統一

刊物來源本來就異質——自創刊、盜譯刊、國際授權版。硬要統一語源，不是逼中文刊硬掰英文名
（現況 `gwalker`、`vboy` 的來歷），就是逼 Famitsu 變成 `dianwan-tong`，兩邊都在丟資訊。

改成：**slug 的來源語言不限，但所有 slug 必須長成同一個形狀。**

### 形狀不變式

無論走哪條產生規則，輸出都必須滿足：

- **拉丁刊名 1–3 段、中文拼音 1–2 段**（hyphen 分隔；`-tw` 後綴不計入段數）。
  這個不對稱是刻意的：**拉丁刊名是刊物自己寫下的字，照錄比丟詞更有出處；拼音是我們做的
  轉寫，丟詞是為了控制長度**。有出處的東西盡量別動，我們自己造的才需要節制
- **每段都要有出處**：必須是刊名裡的一個詞（不論中英日語源），或是**刊物、主機自印的
  品牌縮寫**（ACE、OXM、CGW、PS、SS、PS2、3DO）。**編輯不得自造縮寫**：
  `Game Developer` 可以取用它的任一個詞，但不能縮成 `gd` 或 `game-dev`，那兩個縮法是
  編輯發明的，刊物沒有這樣印過
- **總長 3–20 字元**
- 全小寫，`^[a-z0-9]+(-[a-z0-9]+)*$`，不連續連字號、不以連字號起訖
- **不可為純數字**（會與期號 slug 的形狀混淆）。允許數字開頭，這是為了 `3do-qingbao`
  ——禁止數字開頭會為單一刊物製造例外，不划算
- **保留字黑名單**：`new`、`edit`、`search`、`admin`、`api`、`i`、`all`、`index`。
  目前沒有這道檢查，而現行的 `next` 已經很接近踩線——`/magazines/[slug]` 是 dynamic
  route，哪天加一個 `/magazines/new` 就撞了。這本刊最後走規則 2 算成 `next-tw`，
  `-tw` 後綴順帶解掉了「太通用」的疑慮

「每段都要有出處」這條是這份規範的核心。它一次否決了現況裡 29 個自造值，而且不必訴諸
「好不好看」這種無法驗證的判準——**任何一段都應該指得出它印在哪裡**。

副作用是產出多半念得出來，但那是結果不是目標：`dengeki-ss-tw` 念不出來仍然合格，
因為 SS 有出處。

### 產生規則（先命中先用）

**規則 1 — 刊物自印的並列刊名（`nameParallel`）。**
去掉體裁尾綴，**照錄剩下的所有詞**（上限 3 段）。

`nameParallel` 存的是**刊物拿來當招牌的那個形式**，不是最完整的形式：刊物自己以縮寫代稱
時（電腦玩家的 ACE、新遊戲時代的 SGM），欄位裡存的就是縮寫，全名進 `aliases`。
**判斷在錄入資料時完成，規則本身不做選擇**——這樣規則 1 仍然是純函數，符合元規則 A。

    ACE（全名 Amazing Computer Entertainment）→ ace
    SGM（全名 Style Game Magazine）→ sgm
    SWM（封面小 logo，官網 swm.com.tw）→ swm
    SOFTSTAR MAGAZINE → softstar
    WOLF Weekly → wolf
    RETRO GAME TIME → retro-game-time
    TV.GAME SUPER GUIDE → tvgame-super-guide
    Victory Boy → victory-boy
    e-Generation Weekly → e-generation
    ASTRO TV GAMES MAGAZINE → astro-tvgames
    Game Developer → game-developer
    GAME FACTORY → game-factory
    Games People → games-people
    GAME WALKER → game-walker
    GAME TIMES → game-times
    TV GAME INFORMATION → tvgame-information
    TV.GAME REPORT → tvgame-report
    TV GAME MAGAZINE → tvgame-magazine
    FASHION GAME → fashion-game
    V KIDS → v-kids

**不再縮短，也不丟詞。** `Game Developer` 不寫成 `game-dev`、`TV GAME INFORMATION` 不寫成
`tvgame-info`，儘管兩者都短得多也照樣認得出來——那些縮法是我們發明的，刊物封面上沒有。一旦允許「合理的縮短」，規則就退回
「編輯自由心證」，而那正是 `gd`、`gpeople` 的來歷。

**「首詞 + 末詞」對中英文都成立，但成立的理由相反。** 中文刊名是〔題材通用詞〕+
〔區別詞〕——電玩｜百分百、電視遊樂｜報導——區別力在末詞；英文刊名是〔區別詞〕+
〔題材通用詞〕——Retro｜Game Time、Soft｜World、Style｜Game——區別力在首詞。同一條
規則兩端都取，所以不必為語源分岔。

**規則 2 — 外刊的授權版、翻譯版或國際版。**
原刊的通用羅馬字識別 + `-tw`。取通稱而非全名，因為通稱才是讀者認得的那個
（`aliases` 裡記的就是「電擊PS」）。

    電玩通（ファミ通）→ famitsu-tw
    電擊PlayStation（電撃PS）→ dengeki-ps-tw
    電擊SEGA SATURN（SS）→ dengeki-ss-tw
    電擊王（電撃王）→ dengeki-oh-tw
    電腦遊戲世界（Computer Gaming World）→ cgw-tw
    次世代遊戲情報（Next Generation 國際中文版）→ next-tw
    華泰任天堂秘笈（ファミリーコンピュータMagazine，通稱ファミマガ）→ famimaga-tw

**主機縮寫取當年並稱的那一組。** SEGA SATURN 寫 `ss` 而不是 `saturn`，因為 SS 與 PS 是
同世代玩家並著講的一對，取 `saturn` 會讓同一個刊系裡出現兩種造詞法。結果是電擊系三本
`dengeki-ps-tw`／`dengeki-ss-tw`／`dengeki-oh-tw` 長度一致、形狀一致——**刊系的平行關係
在 slug 上看得出來**，這是規則 2 額外換到的東西。

`-tw` 是**強制而非慣例**：只要 slug 主體借用了外國刊物的識別就必須加。這條解釋了現況裡
一個看似無關的不一致——`cgw`／`oxm` 與 `dps-tw` 其實同屬一類，只是漏了後綴。`cgw` 裸著
會讓人以為指美國原刊。

**規則 3 — 其餘，走創刊名的漢語拼音。**
去掉體裁尾綴後切詞，**取首詞 + 末詞**，中間詞丟棄。

    精訊｜電腦              → jingxun-diannao
    電玩｜百分百｜週刊        → dianwan-baifenbai
    3DO｜次世代｜總合｜情報誌  → 3do-qingbao

「首詞 + 末詞」不是為了好看才選的。它同時做到三件事：確定性（不需判斷丟哪個）、
把段數釘死在 1–2（形狀不變式自動成立）、而且保住區別力。

**與規則 1 的不對稱是刻意的**：拉丁刊名照錄所有詞（上限 3 段），拼音只取首末兩詞。
拉丁刊名是刊物自己寫下的字，照錄比丟詞更有出處；拼音是我們做的轉寫，丟詞是為了控制長度。

### 羅馬化細則

不寫清楚就等於沒規則。

- **漢語拼音、無聲調、無隔音符號。** 不是因為它比通用拼音正統，而是它有唯一解和現成
  字典庫、能寫成程式；通用拼音沒有穩定實作，注音沒有 ASCII 表示
- **ü 一律寫 u**：《攻略快報》若走規則 3 會是 `gonglue-kuaibao`，不是 `gonglve`
- **一個中文詞 = 一段，段界照詞不照字**：`ruanti-zhixing`，不是 `ruan-ti-zhi-xing`
- **中文詞之間一律用連字號分隔**，不寫成 `jingxundiannao`。除了詞界的一致性，拼音的
  音節邊界本身有歧義（西安 = Xi'an），連字號替代了規範裡不允許的隔音撇號
- **固定的複合題材詞算一段，不拆連字號**：`tvgame-super-guide`、`tvgame-report`、
  `tvgame-magazine`、`tvgame-information`，不是 `tv-game-guide`。理由見下節
- **拉丁字母段原樣保留、不音譯**：`3do-qingbao`
- **切詞與多音字是規則唯一需要人判斷的地方**，所以表單應該是「自動產生 + 可覆寫」，
  不是純自動。《電玩e世代》要把「e世代」切成一個詞（`dianwan-eshidai`），切成兩個詞會
  變成 `dianwan-shidai`，與《電玩時代》撞名

### 體裁尾綴變成唯一區別時，不丟

《電視遊樂雜誌》封面印 TV GAME MAGAZINE。丟掉體裁尾綴 MAGAZINE 之後只剩通用題材詞
`tvgame`，那不是刊名，是類別。所以補一條：**體裁尾綴之所以可丟，是因為它沒有區別力；
當它變成唯一的區別來源時就不該丟。** 結果是 `tvgame-magazine`。

這不是特例，是同一條原則的另一面。

### 為什麼是 `tvgame-` 不是 `tv-game-`

連字號在這套規範裡不是排版，是**詞界**——它宣告兩邊各是一個可以獨立當區別詞的詞。
`tv-game-magazine` 等於主張 TV 與 GAME 各自是一個詞，但它們不是：TV GAME 是當年的固定
題材詞，拆開來哪一半都不指涉任何東西。

三個理由，由強到弱：

1. **形狀不變式**。段數上限是 2，`tv-game-information` 是三段、
   `tv-game-super-guide` 是四段。改用 `tv-game-` 不是換個寫法，是得先放寬不變式或改丟詞
2. **刊物自己就把它綁成一個 token**：《攻略快報》封面印 `TV.GAME SUPER GUIDE`、
   《電視遊樂報導》印 `TV.GAME REPORT`——中間是句點不是空格。另兩本用空格
   （TV GAME MAGAZINE、TV GAME INFORMATION），所以封面證據是二比二，但**沒有任何一本
   把它拆成兩個對等的詞**
3. **同一條規則已經在別處用了**：`3do-qingbao` 的 `3do`、`famitsu-ps2-tw` 的 `ps2`
   都是不拆的複合 token

代價是 `tvgame` 讀起來比 `tv-game` 稍緊。這是可接受的：slug 的職責是可推導與唯一，
可讀性由頁面上的中文刊名負責（元規則 C）。

### 刊系會自己對齊

原本這一節是為了處理《電視遊樂雜誌》與《電視遊樂報導》的違和：照「首詞 + 末詞」算會得到
`dianshi-youle` 與 `dianshi-baodao`，兩本共有的「電視遊樂」在一本裡完整、在另一本裡被
「報導」擠掉。**首詞 + 末詞在刊名長度不同時，會不對稱地處置共同前綴**——這個弱點仍然存在，
規則 3 的刊物要留意。

但這兩本查出封面英文名之後，問題自己消失了：

    TV GAME MAGAZINE  → tvgame-magazine
    TV.GAME REPORT    → tvgame-report
    TV.GAME SUPER GUIDE   → tvgame-super-guide
    TV GAME INFORMATION   → tvgame-information

**不是我們去對齊，是刊物本來就對齊，規則只要別把它拆掉。** 這比人為設計的對齊規則可靠，
也再一次說明查封面的價值。

要注意 `tvgame-` 這個前綴表達的是**題材而非刊系**：前兩本是尖端的兄弟刊，後兩本分屬不同
出版社，只是當年大家都拿 TV GAME 當招牌。這不算錯——slug 反映的就是封面印的字。

真正的刊系關係另有其例：`famitsu-tw`／`famitsu-ps2-tw`、
`dengeki-ps-tw`／`dengeki-ss-tw`／`dengeki-oh-tw`。

### 可丟棄的體裁尾綴（封閉清單）

雜誌、月刊、週刊、半月刊、雙週刊、旬刊，以及英文的 Magazine、Weekly、Biweekly、
Monthly、Quarterly（《疾風快報》WOLF Weekly → `wolf`，《軟體世界》SOFT WORLD MONTHLY、
《電玩双週刊》onlinegame biweekly 同理）。

**不在清單內**：報導、快報、通訊、情報、秘笈、總合情報誌。這些在本語料裡帶區別力。

## 對照表

規則欄為命中的產生規則。長度以字元計。

| 刊名 | 現行 slug | 規則 | 新 slug | 舊長 | 新長 |
| --- | --- | :-: | --- | --: | --: |
| 精訊電腦 | `jxdn` | 3 | `jingxun-diannao` | 4 | 15 |
| 軟體世界雜誌 | `swm` | 1 | `swm` | 3 | 3 |
| 軟體之星 | `ssm` | 1 | `softstar` | 3 | 8 |
| 電腦玩家雜誌 | `ace` | 1 | `ace` | 3 | 3 |
| 電腦遊戲世界 | `cgw` | 2 | `cgw-tw` | 3 | 6 |
| 新遊戲時代雜誌 | `sgm` | 1 | `sgm` | 3 | 3 |
| 次世代遊戲情報 | `next` | 2 | `next-tw` | 4 | 7 |
| 遊戲設計大師 | `gd` | 1 | `game-developer` | 2 | 14 |
| 遊戲工場 | `gf` | 1 | `game-factory` | 2 | 12 |
| Mania 遊戲玩瘋誌 | `mania` | 1 | `mania` | 5 | 5 |
| 舊遊戲時代 | `rgt` | 1 | `retro-game-time` | 3 | 15 |
| 華泰任天堂秘笈 | `htntd` | 2 | `famimaga-tw` | 5 | 11 |
| 電視遊樂雜誌 | `tvgm` | 1 | `tvgame-magazine` | 4 | 15 |
| 電視遊樂報導 | `tvgr` | 1 | `tvgame-report` | 4 | 13 |
| 勝利小子 | `vvkids` | 1 | `vv-kids` | 6 | 7 |
| 攻略快報 | `tvgsg` | 1 | `tvgame-super-guide` | 5 | 18 |
| 星際遊樂雜誌 | `astro` | 1 | `astro` | 5 | 5 |
| 電擊PlayStation | `dps-tw` | 2 | `dengeki-ps-tw` | 6 | 13 |
| 電擊SEGA SATURN | `dss-tw` | 2 | `dengeki-ss-tw` | 6 | 13 |
| 電擊王 | `doh-tw` | 2 | `dengeki-oh-tw` | 6 | 13 |
| 電玩通 | `fmt-tw` | 2 | `famitsu-tw` | 6 | 10 |
| 電玩通PS2 | `fmtps-tw` | 2 | `famitsu-ps2-tw` | 8 | 14 |
| 電玩e世代 | `egen` | 1 | `e-generation` | 4 | 12 |
| 飛訊電玩周刊 | `fashion` | 1 | `fashion-game` | 7 | 12 |
| 電玩百分百週刊 | `game100` | 3 | `dianwan-baifenbai` | 7 | 17 |
| 電玩族雜誌 | `gpeople` | 1 | `games-people` | 7 | 12 |
| 電玩時代 | `gtimes` | 1 | `game-times` | 6 | 10 |
| 電遊人 | `gwalker` | 1 | `game-walker` | 7 | 11 |
| 新世紀 HYPER PlayStation | `hps-tw` | 2 | `hyper-ps-tw` | 6 | 11 |
| 3DO／次世代總合情報誌 | `newgen` | 3 | `3do-qingbao` | 6 | 11 |
| Official Xbox Magazine | `oxm` | 2 | `oxm-tw` | 3 | 6 |
| 電遊通訊 | `tvgameinfo` | 1 | `tvgame-information` | 10 | 18 |
| 勝利少年 | `vboy` | 1 | `victory-boy` | 4 | 11 |
| 疾風快報 | `wolf` | 1 | `wolf` | 4 | 4 |

規則命中分布：規則 1 二十一本、規則 2 十本、規則 3 三本。

與現行值相同的六本：`swm`、`ace`、`sgm`、`mania`、`astro`、`wolf`——都是刊物自己就在用
的招牌。

`wolf` 特別值得記一筆：它原本被歸進「意象式取名」，看起來最像編輯憑感覺取的，結果封面
印的就是 WOLF Weekly。**「看起來像自造」完全不能拿來判斷有沒有出處，只能去查。**

**34 本零撞名**，且不需要任何人工消歧後綴。

### 語料之後才建檔的刊物

這幾本不在上面 34 本的統計裡（有些還沒建檔），列在這裡因為它們是規則在**新刊物**上的
實測——規則要解決的本來就是「新增刊物時不用發明」：

| 刊名 | 現行 slug | 規則 | 新 slug | 依據 |
| --- | --- | :-: | --- | --- |
| 城市少年 | `cityboy` | 1 | `city-boy` | 封面 CITY BOY／CITY BOY GAME MAGAZINE |
| SG遊戲週刊 | `sggw` | 1 | `sg-game` | 封面 SG Game Weekly（丟體裁尾綴 Weekly） |
| 星際遊樂快報 | `astronews` | 3 + 刊系對齊 | `astro-kuaibao` | 無拉丁刊名，跟隨《星際遊樂雜誌》的 `astro` |
| 電玩双週刊／電玩宅速配 | `gamexpress` | 1 + 例外 | `gamexpress` | 見下 |

### 一個明文的例外：`gamexpress`

《電玩双週刊》與《電玩宅速配》是同一筆 `Magazine` 的兩個刊名時期（見 BACKLOG），而元規則 B
說 slug 錨定**創刊名**——照規則整筆該是 `onlinegame`（創刊名的並列刊名 onlinegame biweekly
去掉體裁尾綴），`gamexpress` 降級成後段時期的名字。

**這裡取例外，用 `gamexpress`**（yuxio 2026-08-23）。理由不是規則錯了：創刊時無法預知日後
會不會改名，錨定創刊名仍是對的預設。但這本刊改名已經過了很長一段時間，而創刊期的並列刊名
`onlinegame` 是個過於通用的詞，識別力遠不如 `gamexpress`。

例外要**明文寫進 fixture 並標記**。判準與《電腦玩家》維持 `ace`（而非後期的 PC GAMER）
一併記著：同樣是「創刊期 vs 後期」，`ace` 照規則走是因為創刊期的名字本身就有識別力，
這本反過來。**判準是創刊期的值有沒有識別力，不是哪一段時期比較長**——後者會讓每本長壽刊
都變成例外。

## 統計

四個方案在同一份語料上的量測。B 是三段拼音的早期版本，E 是取消規則 1／2、一律走
中文拼音的版本，兩者都在下一節說明為何落選。

| | 現行 | B 三段混合 | E 全拼音 | **本案** |
| --- | --: | --: | --: | --: |
| 平均長度 | 4.9 | 13.0 | 15.9 | **10.5** |
| 中位數 | 5 | 14 | 15 | **11** |
| 標準差 | 1.8 | 4.5 | 3.5 | **4.3** |
| 最短 | 2（`gd`） | 3（`ace`） | 10（`dianwan-zu`） | **3（`swm`／`ace`／`sgm`）** |
| 最長 | 10（`tvgameinfo`） | 23（`huatai-rentiantang-miji`） | 26（`xinshiji-hyper-playstation`） | **18（`tvgame-super-guide`）** |
| 全距 | 8 | 20 | 16 | **15** |
| 段數 | 1 | 1–3 | 2–3 | **1–3** |
| 編輯自造、無出處的值 | 25 | 0 | 0 | **0** |
| 撞名 | 0 | 0 | 0 | **0** |

本案在離散度（sd 4.3）與最長值（18）上都優於另外兩個新方案，同時保住了
`famitsu-tw`、`dengeki-ps-tw`、`ace` 這些有識別力的值。

三個新方案的自造值都是 0——這是「由規則生成」的定義使然，不是本案的功勞。這一列的意義
在於量出現行的 25，也就是待解決的問題有多大。

平均長度是現行的 2.4 倍。這是換取「可推導」必付的代價，不是可以調參數解決的。

## 落選方案

**B（三段拼音混合）。** 規則與本案相同，但規則 3 不丟中間詞，於是產出
`huatai-rentiantang-miji`(23)、`cishidai-youxi-qingbao`(22)、`dianshi-youle-baodao`(20)
這類三段長串，全距 20。它被淘汰的直接原因是元規則 C 放寬之後就沒有理由保留中間詞了。

**E（全拼音）。** 取消規則 1、2，翻譯刊也用中文刊名：`famitsu-tw` → `dianwan-tong`、
`cgw-tw` → `diannao-youxi-shijie`、`ace` → `diannao-wanjia`。語源完全統一、零不可發音值，
但平均 15.9、最長 26，而且丟掉的正是讀者最認得的那些名字——Famitsu 對這本刊的讀者遠比
`dianwan-tong` 有識別力。E 也做不到完全同構：《Mania 遊戲玩瘋誌》與
《Official Xbox Magazine》本來就沒有純中文刊名。

**中文 slug**（`/magazines/電玩通`）。淘汰理由不是瀏覽器不支援（支援得很好，中文維基
就這麼做），而是雜誌 slug 是**每一條單期網址的前綴**，會出現在後台 log、CSV 匯出、
`curl` 指令、對接 nostalibrary 的欄位裡，那些地方全部看到 `%E9%9B%BB%E7%8E%A9...`。
`prisma/schema.prisma` 對 `Magazine.slug` 限 ASCII（不同於 `Game.slug`／`Tag.slug`）
的既有判斷是對的。

## 已知代價與未決

- **長度**。2.2 倍是規則的固有成本
- **`swm`(3) 與 `tvgame-super-guide`(18) 仍差 15 個字元**，離散度（sd 4.3）也因為那批短
  招牌而回升到僅次於 B 案。這個落差無法在保留「刊物自印品牌」規則的前提下收斂，但它是
  **有解釋的**——短的那些正是刊物自己就有拉丁品牌的那些
- **切詞與多音字**沒有全自動解，規則交給人工覆寫，代價是規則不是純機械的
- **`game-developer`(14) 明顯長於 `game-dev`(8)**，而 `game-dev` 一樣認得出來。放棄縮短
  是為了守住「每段都有出處」；這條線一鬆，規則就沒有邊界了
- **`game-developer`、`game-factory`、`games-people` 三本都以 `game(s)` 起頭**，看起來像
  同一個系列。這是它們封面本來就長那樣，不是規則造成的
- **`gamexpress` 是規範裡唯一的明文例外**，規則的輸出是 `onlinegame`。這是「錨定創刊名」
  第一次撞上「創刊期的名字沒有識別力」，判準與處理見對照表後的說明
- **`tvgame-report` 取自中期封面，不是創刊號封面**，與元規則 B（錨定創刊名）有張力。
  這裡採用它，是因為創刊期查不到任何英文名，而中期的 TV.GAME REPORT 與同刊系其他三本
  一致；若日後查到創刊號封面另有寫法，以創刊號為準
- **`2026-08-22-magazine-title-design.md` 記載《電視遊樂報導》有「電視遊樂情報」時期**，
  但查無實據，該文件的刊名時期表應一併複查
- **三本走規則 3，其中兩本已查證確實沒有拉丁刊名**（精訊電腦、電玩百分百週刊），
  只有 3DO 誌還沒查。已改判的十四本都是查了封面才從規則 3 移出
  （`jiu-shidai` → `retro-time`、`youxi-dashi` → `game-developer`、
  `youxi-gongchang` → `game-factory`、`dianwan-zu` → `games-people`、
  `dianyou-ren` → `game-walker`、`cishidai-qingbao` → `next-tw`、
  `shengli-xiaozi` → `v-kids`、`dianwan-shidai` → `game-times`、
  `dianyou-tongxun` → `tvgame-information`、`dianshiyoule` → `tvgame-magazine`、
  `dianshiyoule-baodao` → `tvgame-report`、`feixun-dianwan` → `fashion-game`、
  `ruanti-zhixing` → `softstar`、`jifeng-kuaibao` → `wolf`、`huatai-miji` → `famimaga-tw`）。
  這件事的規模比預期大：**封面盤點才是這份規範真正的工作量**，規則本身只是骨架。
- **規則 2 取通稱而非全名**（`dengeki-ps-tw` 而非 `dengeki-playstation-tw`）沒有硬判準，
  依 `aliases` 裡記載的通稱為準
- **`3do-qingbao`** 的首詞是拉丁品牌、末詞是拼音，是語料裡唯一的混合段組合

## 自印的拉丁刊名記在哪

規則 1 把「刊物自印的拉丁刊名」升格成規則的**輸入**，那它就不能再是備查用的雜項。現況是
丟進 `Magazine.aliases`，而那一欄同時裝著自印英文名、改名後的名字、原刊名、俗稱——五種
關係混在一個陣列裡，誰也查不出什麼。slug 規範就在這裡踩過坑：因為分不出來，`gwalker`、
`vvkids`、`gtimes` 被誤讀成憑空意譯。

名稱欄位的整體規劃另立一份文件：**`2026-08-23-magazine-name-fields-design.md`**。結論
與本規則的對應是：

| 欄位 | slug 規則 |
| --- | --- |
| `sourceTitle` 有值（本刊翻譯自哪本外刊） | 規則 2 |
| `nameParallel` 有值（刊物自印的並列刊名） | 規則 1 |
| 皆無 | 規則 3（拼音保底） |

**slug 規則的優先序恰好就是欄位的判定順序**，這也是那個切分正確的旁證。

## 待查清單

規則 3 只剩三本，其中兩本**已查證確實沒有拉丁刊名**——《精訊電腦》、《電玩百分百週刊》。
只剩一本未查：

| 刊名 | 現行 | 暫定值 | 要查什麼 |
| --- | --- | --- | --- |
| 3DO／次世代總合情報誌 | `newgen` | `3do-qingbao` | 封面是否為 NEW GENERATION；目前缺實體資料 |

另有一批未逐字查證：**規則 2 那十本的原刊名寫法**。`dengeki-oh-tw`（電撃王）、
`dengeki-ss-tw`（SEGA SATURN 取 SS）、`hyper-ps-tw`、`famimaga-tw`（ファミマガ）、
`next-tw` 都是依通稱推的，需對照原刊實物確認。

### 一個尚未定案的值

**`victory-boy`（勝利少年）與 `v-kids`（勝利小子）不對齊。** 一本封面印全名 Victory Boy、
一本印縮寫 V KIDS，所以規則各取所印。這不算問題——兩本分屬不同出版社（尖端與勝利少年
雜誌社），本來就不是刊系，不需要共用主體。

**`onlinegame`（電玩双週刊／電玩宅速配）。** 見對照表後的說明：規則的輸出與識別力在這裡
第一次衝突。

## 規則怎麼驗證

散文式規範會被遺忘，fixture 不會。`src/lib/slugify.ts` 已經有測試的前例
（`src/__tests__/lib/slugify.test.ts`），同樣的做法：把上面 34 列的〔創刊名 → 期望 slug〕
列成表放進測試，規則一改就整批跑。

除了逐列比對，形狀不變式裡**機器可判的那幾條**應該獨立驗證——段數 ≤ 2、總長 3–20、
不為純數字、不在保留字黑名單。

「每段都要有出處」機器判不了，它是**審核時的問句**：這一段印在哪裡？答不出來就不合格。
對應到資料，出處應該同時寫進 `aliases`，讓下一個人查得到——現況正是因為
`aliases` 沒填全，才會把 `gwalker`、`vvkids` 誤讀成憑空意譯。

這張表同時是規範文件本身，並且要包含**故意不合規則的既有例外**，明確標記 grandfathered
——讓「規則的價值在新增刊物時不用再想」這件事寫在程式碼裡，而不是靠記憶。
