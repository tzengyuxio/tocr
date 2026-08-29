# Magazine Slug 一覽

規則的推導、取捨與被否決的方案見
[Magazine Slug 命名規範 Design](plans/2026-08-23-magazine-slug-convention-design.md)。
這份文件只放規則摘要與現況表。

## 兩層 slug

| 層 | 用在哪 | 誰決定 |
| --- | --- | --- |
| **magazine slug** | 資料庫的 `Magazine.slug`，公開網址 `/magazines/<slug>` 的前綴 | 一本刊只定一次，改名不動 |
| **title slug** | 封面掃描檔的檔名前綴（見 `~/Pictures/covers/NAMING.md`） | 預設等於 magazine slug，**刊名改變時另立** |

分成兩層是因為改名常伴隨期號重編：疾風快報出到 212 期，改名攻略快報後回到試刊號重編，
兩者若共用 `wolf`，`wolf_003` 就分不出是哪一本。資料庫用 join 表達「同一本刊」，
檔名只能靠字串自我說明。

**title slug 不預先產生**——某個刊名時期真的有掃描檔要命名時才定。表中留 `—` 的列
就是還沒有檔案的時期，不是漏填。

## 規則摘要

enum 的數字就是判定順序：**1 → 2 → 3**，命中即停；4 是規則之外的明文例外。

| enum | 依據 | 取法 | 例 |
| --- | --- | --- | --- |
| `1.PARA` | 封面上的拉丁刊名：並列刊名（`Magazine.nameParallel`）、刊物自印的簡稱招牌，或刊名本身即拉丁字 | 照錄所有詞，上限 3 段 | `game-factory`、`swm` |
| `2.SOURCE` | 原刊（`Magazine.sourceTitle`），本刊整體是它的中文版 | 取母刊通稱 + 強制 `-tw` | `famitsu-tw`、`dengeki-ps-tw` |
| `3.PINYIN` | 前兩者皆無 | 創刊名去體裁尾綴後切詞，**取首詞 + 末詞** | `jingxun-diannao`、`tvgame-kuaixun` |
| `4.EXCEPT` | 規則的輸出沒有識別力 | 明文記錄，逐案判斷 | `gamexpress`、`gonglue-yuekan` |

**形狀不變式**：拉丁 ≤3 段、拼音 ≤2 段、總長 3–20 字元、每段都要有出處、不可為純數字。

**固定的複合題材詞算一段，且優先於拼音。** `tvgame` 是這批雜誌共用的題材詞——四本分屬
不同出版社的刊都在用（`tvgame-magazine`、`tvgame-report`、`tvgame-information`、
`tvgame-super-guide`），它不是任何一本的專屬識別。所以走 3.PINYIN 的刊，遇到「電視遊樂」
這種詞時取 `tvgame` 而不是 `dianshi`：`tvgame-kuaixun`，不是 `dianshi-kuaixun`。
後者把「遊樂」丟掉了，讀起來像「電視快訊」。
與 `3do-qingbao` 同型——一段拉丁、一段拼音的混合段是允許的。

**可丟棄的體裁尾綴（封閉清單）**：雜誌、月刊、週刊、半月刊、雙週刊、旬刊，
Magazine、Weekly、Biweekly、Monthly、Quarterly。
**不在清單內**：報導、快報、通訊、情報、秘笈、總合情報誌——這些在本語料裡帶區別力。

判定「封面上這個拉丁字是母刊的標識，還是這本刊自己取的」決定走 `1.PARA` 還是 `2.SOURCE`。
《勝利小子》是反例：它是《Vジャンプ》的中文版，但 V. V. KIDS 是台灣版自取的名字。

## 刊名時期與 slug 的錨定

**改過名的刊，刊名時期一律建齊，不看那個時期有幾期。** MagazineTitle 是事實記錄不是
選擇——第 5 期封面印「任天堂程式解法大公開」，不建就等於宣稱那期叫別的名字。設界線
（幾期以下不建）會逼出兩個沒有好答案的問題：界線畫在哪、以及跨過界線後以哪個名字為主。
建齊則一個都不用回答。

建齊之後**要把該刊名從 `aliases` 移除**：同一個事實不存兩份，而且 aliases 的語意是俗稱
與其他寫法，不是先後刊名。搜尋不會因此變差，`/api/magazines` 的查詢條件已經涵蓋 `titles`。

**slug 是另一回事。** 它只能有一個值，所以極短的創刊期不該搶走它。預設錨定創刊名，
遇到創刊期極短、或創刊名算不出合規值時改錨定主要時期，**理由寫進備註，不訂「幾期以下」
的數字門檻**——門檻畫在 3 期還是 5 期都是任意的，而 slug 一本刊只由人決定一次，需要的
不是可機械執行的界線，是每個決定都寫得出理由。

現有的三個讓步：

| 刊 | slug 錨定 | 理由 |
| --- | --- | --- |
| `huatai-miji` | 第 7–28 期（22/24 期） | 創刊名的規則輸出 `rentiantang-dagongkai` 21 字元，破形狀不變式 |
| `tvgame-magazine` | 第 2 期起（298/300 期） | 創刊期只有試刊號與創刊號兩期 |
| `tvgame-report` | 中期封面 | 創刊期查不到英文名 |

## 一覽表

同一刊系的不同刊名時期各佔一列，`magazine slug` 欄相同。長度計 title slug。
`nostalibrary slug` 是上游帶進來的舊值，2026-08-23 已全數退役進 `MagazineSlug`，
`/magazines/<舊值>` 回 308。

| 刊名 | title slug | magazine slug | 規則 | 長度 | nostalibrary slug | 備註 |
| --- | --- | --- | :-: | --: | --- | --- |
| 電腦玩家雜誌 | `ace` | `ace` | 1.PARA | 3 | `ace` | 自印簡稱；後期改標 PC GAMER，slug 錨定創刊期 |
| 星際遊樂雜誌 | `astro` | `astro` | 1.PARA | 5 | `astro` | 自印簡稱 |
| 星際遊樂快報 | `astro-kuaibao` | `astro-kuaibao` | 3.PINYIN | 13 | — | 首段沿用姊妹刊 astro，依據待補 |
| 電腦遊戲世界 | `cgw-tw` | `cgw-tw` | 2.SOURCE | 6 | `cgw` | Computer Gaming World 國際中文版 |
| 遊戲世界 | — | `cgw-tw` | — | — | — | 第 163 期起的刊名，尚無掃描檔 |
| 城市少年 | `city-boy` | `city-boy` | 1.PARA | 8 | — |  |
| 金手指補給站 | `code-supply-depot` | `code-supply-depot` | 1.PARA | 17 | — | TOUGH CODE SUPPLY DEPOT 四段取三，捨 TOUGH |
| 電擊王 | `dengeki-oh-tw` | `dengeki-oh-tw` | 2.SOURCE | 13 | `doh-tw` |  |
| 電擊PlayStation | `dengeki-ps-tw` | `dengeki-ps-tw` | 2.SOURCE | 13 | `dps-tw` |  |
| 電擊SEGA SATURN | `dengeki-ss-tw` | `dengeki-ss-tw` | 2.SOURCE | 13 | `dss-tw` | 主機縮寫取當年與 PS 並稱的 SS |
| 電玩百分百週刊 | `dianwan-baifenbai` | `dianwan-baifenbai` | 3.PINYIN | 17 | `game100` | 已查證無拉丁刊名 |
| 電玩e世代 | `e-generation` | `e-generation` | 1.PARA | 12 | `egen` |  |
| 電玩通PS2 | `famitsu-ps2-tw` | `famitsu-ps2-tw` | 2.SOURCE | 14 | `fmtps-tw` |  |
| 電玩通PLAYSTATION+ | — | `famitsu-ps2-tw` | — | — | — | VOL.103 起的刊名，尚無掃描檔 |
| FAMITSU PSP+PS3 TAIWAN | — | `famitsu-ps2-tw` | — | — | — | VOL.116 起的刊名，尚無掃描檔 |
| 電玩通 | `famitsu-tw` | `famitsu-tw` | 2.SOURCE | 10 | `fmt-tw` |  |
| 飛訊電玩周刊 | `fashion-game` | `fashion-game` | 1.PARA | 12 | `fashion` |  |
| 遊戲設計大師 | `game-developer` | `game-developer` | 1.PARA | 14 | `gd` | 未縮成 game-dev，守住每段有出處 |
| 遊戲工場 | `game-factory` | `game-factory` | 1.PARA | 12 | `gf` |  |
| Game天堂! | `game-paradise` | `game-paradise` | 1.PARA | 13 | — | ファミマガ 的授權中文版，但並列刊名為台灣版自取，故不走 2.SOURCE |
| 電玩時代 | `game-times` | `game-times` | 1.PARA | 10 | `gtimes` |  |
| 電遊人 | `game-walker` | `game-walker` | 1.PARA | 11 | `gwalker` |  |
| GameQ | `gameq` | `gameq` | 1.PARA | 5 | — | 刊名本身即拉丁字，非並列刊名 |
| 電玩族雜誌 | `games-people` | `games-people` | 1.PARA | 12 | `gpeople` |  |
| 電玩双週刊 | — | `gamexpress` | — | — | — | 創刊名；規則的輸出是 onlinegame |
| 電玩宅速配 | `gamexpress` | `gamexpress` | 4.EXCEPT | 10 | `gamexpress` | 明文例外之一：創刊名無識別力，改錨定後期名 |
| 電玩向前走 | `goal-goal` | `goal-goal` | 1.PARA | 9 | — | 試刊名《電玩GOGO》仍在 aliases，待改建為刊名時期 |
| 攻略月刊 | `gonglue-yuekan` | `gonglue-yuekan` | 4.EXCEPT | 14 | — | 明文例外之二：丟掉「月刊」後只剩 gonglue，無識別力 |
| 任天堂程式解法大公開 | `rentiantang-jiefa` | `huatai-miji` | 3.PINYIN | 17 | — | 創刊名，第 5–6 期；首末詞輸出 rentiantang-dagongkai 破 20 字元上限，末詞改取「解法」 |
| 華泰任天堂秘笈 | `huatai-miji` | `huatai-miji` | 3.PINYIN | 11 | `htntd` | 第 7–28 期，slug 錨定此期；未授權翻印ファミマガ，不掛 -tw |
| 新世紀 HYPER PlayStation | `hyper-ps-tw` | `hyper-ps-tw` | 2.SOURCE | 11 | `hps-tw` |  |
| 精訊電腦 | `jingxun-diannao` | `jingxun-diannao` | 3.PINYIN | 15 | `jxdn` | 已查證無拉丁刊名 |
| Mania 遊戲玩瘋誌 | `mania` | `mania` | 1.PARA | 5 | `mania` | 刊名本身即拉丁字 |
| 次世代遊戲情報 | `next-tw` | `next-tw` | 2.SOURCE | 7 | `next` | 原刊名寫法依通稱推定，未對實物 |
| Official Xbox Magazine | `oxm-tw` | `oxm-tw` | 2.SOURCE | 6 | `oxm` |  |
| 舊遊戲時代 | `retro-game-time` | `retro-game-time` | 1.PARA | 15 | `rgt` |  |
| SG遊戲週刊 | `sg-game` | `sg-game` | 1.PARA | 7 | — | SG Game Weekly 去體裁尾綴 |
| 新遊戲時代雜誌 | `sgm` | `sgm` | 1.PARA | 3 | `sgm` | 自印簡稱 |
| 軟體之星 | `softstar` | `softstar` | 1.PARA | 8 | `ssm` |  |
| 軟體世界雜誌 | `swm` | `swm` | 1.PARA | 3 | `swm` | 自印簡稱 |
| 電遊通訊 | `tvgame-information` | `tvgame-information` | 1.PARA | 18 | `tvgameinfo` |  |
| 電視遊樂快訊 | `tvgame-kuaixun` | `tvgame-magazine` | 3.PINYIN | 14 | — | 創刊名，僅試刊號與創刊號；封面無並列刊名，首段用固定題材詞 `tvgame` 而非 `dianshi` |
| 電視遊樂雜誌 | `tvgame-magazine` | `tvgame-magazine` | 1.PARA | 15 | `tvgm` | 第 2 期起，slug 錨定此期；並列刊名取自後期封面，初期封面無 |
| GAME fans | `game-fans` | `tvgame-magazine` | 1.PARA | 9 | — | 新刊 1 號起改用新編號 |
| 電視遊樂情報 | — | `tvgame-report` | — | — | — | 第 1–18 期的刊名；查無實據，待複查 |
| 電視遊樂報導 | `tvgame-report` | `tvgame-report` | 1.PARA | 13 | `tvgr` | 取自中期封面；創刊期查不到英文名 |
| Super Gamer流行電玩週刊 | — | `tvgame-report` | — | — | — | 新舊期數並行時期，尚無掃描檔 |
| 攻略快報（尖端） | `tvgame-super-guide` | `tvgame-super-guide` | 1.PARA | 18 | `tvgsg` | 與疾風系的《攻略快報》同名不同刊 |
| 勝利少年 | `victory-boy` | `victory-boy` | 1.PARA | 11 | `vboy` |  |
| 勝利小子 | `vv-kids` | `vv-kids` | 1.PARA | 7 | `vvkids` | V. V. KIDS 是台灣版自取，故非 vjump-tw |
| 疾風快報 | `wolf` | `wolf` | 1.PARA | 4 | `wolf` | 封面印 WOLF Weekly |
| 攻略快報（疾風） | `game-weekly` | `wolf` | 1.PARA | 11 | — | 改名而來，同 ISSN 1028-6180；已建為 wolf 的刊名時期 |
| 3DO／次世代總合情報誌 | `3do-qingbao` | `3do-qingbao` | 3.PINYIN | 11 | `newgen` | 混合段：3do 為拉丁品牌原樣保留；尚未建檔 |

## 未建檔