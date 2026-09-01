---
status: done
created: 2026-09-02
completed: 2026-09-02
---

# `/api/issues` 的分頁會重複與漏列——`order` 並列時 offset 不穩

`GET /api/issues` 不帶 `magazineId` 逐頁抓完全站，**回來的筆數對得上、內容卻不對**：

```
分頁總筆數 2306   實際不重複 id 2282   → 24 筆重複，等於同時漏掉 24 期
```

漏掉的例子（2026-09-02 實測）：`ace` 應有 216 期只回 214、`gonglue-yuekan` 應有 5 期只回 3。

## 為什麼

`src/app/api/issues/route.ts` 的查詢是：

```ts
orderBy: { order: "asc" },
skip,
take: limit,
```

`Issue.order` 是**每本刊各自從 0 起算**的，全站掃描時大量並列。
排序鍵有並列而沒有 tie-breaker 時，Postgres 不保證兩次查詢裡並列列的相對位置一致——
於是第 N 頁的尾巴和第 N+1 頁的頭可能是同一列，中間那列就被跳過。
`skip`/`take` 這種 offset 分頁只要排序不是全序就會這樣，資料沒動也一樣。

## 已修（2026-09-02）

加一個唯一的 tie-breaker，讓排序變成全序：

```ts
orderBy: [{ order: "asc" }, { id: "asc" }],
```

`id` 是 cuid、唯一且不變，不影響既有的顯示順序（同一 `order` 內部的先後本來就沒有語意）。
`/api/export` 早就是這樣寫的（`orderBy: [{ order: "asc" }, { id: "asc" }]`），這次只是補齊。

**同一個模式一起掃過**的結果：

- `/api/articles`——`[{ issue: { publishSort } }, { sortOrder: "asc" }]`，同一天出刊的兩本刊
  會拿到同一組鍵，**同樣會重複與漏列**，已補 `{ id: "asc" }`
- `/api/games`——排序鍵來自 `gameOrderBy()`（與公開的遊戲索引共用）。依文章數排時已經拿
  名稱當第二鍵，但 `Game.name` 沒有 `@unique`（唯一的是 `slug`），兩種排序**都**收尾補上
  `{ id: "asc" }`；改一處，後台清單與 `/games` 一起修好
- `/api/photos`——**沒有 GET，也沒有分頁**，只有 POST 裡拿 `order: "desc"` 找最後一張，
  不受影響
- 順帶看到但這次沒動：`/api/tags`（`name` 非唯一）、`/api/magazines`（`createdAt` 可能同批
  匯入而並列）、`/admin/edit-logs`、`/admin/export-logs`（都是 `createdAt: "desc"`）
  有同樣的形狀，只是還沒有觀察到症狀

## 影響範圍

- **前端**：任何用這個端點分頁的清單都會漏資料。單刊查詢（帶 `magazineId`）因為每批都小、
  通常一頁裝得下，不容易看出來——這也是為什麼一直沒被發現
- **外部腳本**：`~/lab/nostalib-toolkit/scripts/covers_vs_tocr.py` 原本就是踩到這個
  才誤報「tocr 找不到這一期」（`gonglue-yuekan_005/009` 明明站上有）。
  該腳本已改成**逐刊查詢並用各刊的 `total` 核對筆數**繞開，修好之後可以簡化回去，
  但那個核對本身值得留著

## 重現

```sh
python3 - <<'PY'
import json, subprocess
def get(u): return json.loads(subprocess.run(["curl","-sSfL",u],capture_output=True,text=True).stdout)
ids, p = [], 1
while True:
    d = get(f"https://tocr.simagame.me/api/issues?page={p}&limit=100")
    ids += [i["id"] for i in d["data"]]
    if p >= d["pagination"]["totalPages"]: break
    p += 1
print(len(ids), len(set(ids)))   # 2306 2282
PY
```
