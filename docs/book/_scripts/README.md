# 快照產生器

書稿資料裡「機器產的那半」的來源。全部走正式站的公開 API，不需要憑證。

| 檔 | 做什麼 |
| --- | --- |
| `fetch.sh` | 依 `magindex.tsv`（slug＋id，從 `/api/magazines?limit=100` 取）分頁抓每本刊的所有單期，寫成 `issues/<slug>.json`。**`limit` server-side 上限 100，一定要分頁** |
| `stats.mjs` | 由 `mags.json` ＋ `issues/` 算出每刊摘要 `summary.json` |
| `gen.mjs` | 產 `../magazines/NN-slug.md` 的資料卡、收錄狀況、全期一覽與資料缺口，並輸出 `index.json` |
| `gen-appendix.mjs` | 由 `index.json` ＋ `issues/` 產 `../appendix/` 的四份表 |

## 跑法

```sh
mkdir -p work && cd work
curl -s "https://tocr.simagame.me/api/magazines?limit=100" -o mags.json
jq -r '.data[] | "\(.slug)\t\(.id)"' mags.json > magindex.tsv
bash ../fetch.sh
node ../stats.mjs
node ../gen.mjs
node ../gen-appendix.mjs
```

## 重跑時要小心

`gen.mjs` **會整份覆寫** `../magazines/NN-slug.md`，包括人寫的〈沿革〉〈可寫的話題〉
〈出處〉三節。重跑前先備份那三節，或改成只更新資料卡。編號前綴依創刊日重算，
新增雜誌會讓後面的檔名整批位移。

乾跑（不動到 repo 裡的稿）：

```sh
mkdir -p out/magazines out/appendix
env BOOK_DIR=$PWD/out node ../gen.mjs
env BOOK_DIR=$PWD/out node ../gen-appendix.mjs
```
