# 遊戲條目體檢的輸出

`scripts/audit-games.ts --prod --csv=data/game-audit` 產生的明細，判準與欄位說明見
[docs/data-conventions.md](../../docs/data-conventions.md) 的「重複條目怎麼歸類」。

**這裡的檔案是某一次量測的快照，不是正本**——整理過後就過時，要重跑腳本覆蓋。
commit 進來是為了讓「這批清掉了多少」在 git 歷史上看得出來，不是為了長期維護它們。

| 檔案 | 裝什麼 |
| --- | --- |
| `paren-en.csv` | 名稱裡夾著英文原名，該搬進 `nameEn`／`aliases` |
| `loose-dup.csv` | 剝掉英文原名之後撞名的群組 |
| `key-dup.csv` | `nameKeys` 已經撞在一起的群組 |
| `kana.csv` | 名稱含假名，多半是日文原名被建成獨立條目 |
| `long.csv` | 名稱超過 25 字，多半是標語被當成遊戲名 |
| `orphan.csv` | 沒有任何文章引用 |

`scripts/match-cdosgame.ts --prod` 與 `scripts/suggest-platforms.ts --prod` 產的另外三份：

| 檔案 | 裝什麼 |
| --- | --- |
| `cdosgame-koei.csv` | 光榮（KOEI）59 款的對照 |
| `cdosgame-all.csv` | cdosgame 全部 2,655 款的對照 |
| `platforms-suggested.csv` | `Game.platforms` 的寫入提案，`risk` 空的才會被 `apply-platforms.ts` 寫 |
| `merge-candidates.csv` | 合併候選：同一個 cdosgame 條目對到站上好幾筆（`--groups`） |

每一列的 `articles_sample` 是該條目掛在哪幾篇文章上（最多三篇）。**撞名的群組要看這一欄
才判得出來**：同一個中文譯名底下可能是三款不同遊戲——站上的「洪荒帝國」就掛著
`(The Legacy)`、`(Dune)`、`(Savage Empire)` 三個括號。`group` 欄相同的是同一組。

## platforms-suggested.csv 怎麼審

`risk` 欄是「這一列的對照本身可能錯」，**看過之後把它清掉就等於核准**，下次跑
`apply-platforms.ts` 就會寫進去；判定不該寫的那列直接刪掉。

判斷靠兩欄：`shared_with` 列出跟它共用同一個上游條目的其他站上條目，`sources`
是出處。看到「三國志IV／三國志 IV／三國志4中文版」就知道是同一款的三種抄法、
都標同一個平台是對的；看到 `Age of Empires` 與 `世紀帝國` 共用 `cdg-0666`，那是
**兩筆該合併的重複條目**——這一欄比 `loose-dup.csv` 的判準強，因為上游的
`title_aliases` 認得出字面毫無重疊的同一款。

## merge-candidates.csv 怎麼用

同一個上游條目對到站上好幾筆，就是一組候選——**判準比 `loose-dup.csv` 強**，因為
cdosgame 連 `title_aliases` 一起比，抓得到 `Age of Empires` 與 `世紀帝國`、
`太平洋空戰英雄` 與 `Aces of the Pacific` 這種字面毫無重疊的同一款。192 組、
394 筆，182 組是兩筆、10 組是三筆。

**仍然只是候選。** 已知的誤中有兩類：

- **名稱含假名**（status 標了，9 筆）：`nameKey` 把假名整段丟掉，`カスタムメイト・2`
  正規化後只剩 `2`，於是撞上「七年戰爭2：決戰王朝」那組
- **總稱被拉進單代**：`三國志`（13 篇）被拉進 `三國志：風雲再起` 那組，那是系列
  總稱不是同一款

合併會把落選那筆真的刪掉，所以動手前要看文章（見 data-conventions 的
「重複條目怎麼歸類」）。

## 2026-09-20 的基準

正式站 6,744 筆。`paren-en` 143、`loose-dup` 114 組 243 筆、`key-dup` 19 組 39 筆、
`kana` 145、`long` 139、`orphan` 19。引用分佈：0 篇 19、1 篇 4,817、2–4 篇 1,637、
5 篇以上 271。欄位填寫率當時幾乎全空（`nameEn` 0、`platforms` 0、`releaseDate` 0）。

**同日寫入 `platforms` 共 1,353 筆**（`apply-platforms.ts --apply`，走 API、兩輪都零
失敗）：先寫 965 筆單一來源、主名精確對上、一對一的那批，之後修掉「共用來源」的
身分粒度（《電玩通》那邊原本拿期號當條目身分，同一期的幾十款遊戲會全部算成共用），
可寫的升到 1,353，補寫剩下的 388 筆。站上共 1,452 個平台值——多出來的 99 個是
跨平台的遊戲。

**剩 580 筆帶著 risk 等人審**：靠別名對上 389、來源同時給了別筆 377、對到多個上游
條目 36、名稱含假名 2（可疊加）。審法見上面那節。
