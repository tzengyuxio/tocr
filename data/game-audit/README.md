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

每一列的 `articles_sample` 是該條目掛在哪幾篇文章上（最多三篇）。**撞名的群組要看這一欄
才判得出來**：同一個中文譯名底下可能是三款不同遊戲——站上的「洪荒帝國」就掛著
`(The Legacy)`、`(Dune)`、`(Savage Empire)` 三個括號。`group` 欄相同的是同一組。

## 2026-09-20 的基準

正式站 6,744 筆。`paren-en` 143、`loose-dup` 114 組 243 筆、`key-dup` 19 組 39 筆、
`kana` 145、`long` 139、`orphan` 19。引用分佈：0 篇 19、1 篇 4,817、2–4 篇 1,637、
5 篇以上 271。欄位填寫率當時幾乎全空（`nameEn` 0、`platforms` 0、`releaseDate` 0）。
