# Unified TOC Editing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓「複查辨識結果」與「文章列表編輯」變成同一個畫面 —— 單期編輯頁 —— 並讓辨識結果直接落地成文章，從根上消除重複儲存。

**Architecture:** 以 `ArticleListClient` 為底擴充（它已接真實 API、有拖曳排序與刪除確認），把 `OcrResultEditor` 的目錄圖檢視器與插入列搬過去，然後刪除 `OcrResultEditor`。`/admin/ocr` 縮成上傳與辨識，辨識完直接 `POST /api/articles/batch` 落地再導向單期編輯頁。

**Tech Stack:** Next.js 15 App Router、React 19、Prisma、Zod、jest + React Testing Library、Tailwind + shadcn/ui、@dnd-kit

**Spec:** `docs/plans/2026-08-16-unified-toc-editing-design.md`

## Global Constraints

- 註解、變數命名、commit message 一律英文；UI 文案一律繁體中文
- Conventional Commits（`feat:`／`fix:`／`refactor:`／`docs:`／`test:`）
- TDD：每個 task 先寫失敗測試，跑到紅，才寫實作
- 測試指令 `npx jest <path>`；型別檢查 `npx tsc --noEmit`；lint `npx eslint <paths>`
- 不新增 schema migration —— 這次不動 `prisma/schema.prisma`
- 既有的 `logEdit`／`logEditBatch` 呼叫不可遺漏：每個寫入路徑都要留下編輯紀錄
- API token 的寫入永遠不標記 `tocReviewedAt`

---

### Task 1: 抽出關聯 resolver

把 `batch/route.ts` 裡的 find-or-create 邏輯抽成共用 module，讓批次建立與單篇更新吃同一份。

**Files:**
- Create: `src/lib/resolve-relations.ts`
- Modify: `src/app/api/articles/batch/route.ts:46-125`
- Test: `src/__tests__/lib/resolve-relations.test.ts`

**Interfaces:**
- Consumes: `TagInput` from `src/lib/tag-input.ts`（`{ name: string; type: string }`）
- Produces:
  - `resolveGameIds(tx: TxClient, names: string[]): Promise<string[]>` —— 依序回傳 id，順序即輸入順序（呼叫端靠第一個決定 primary）
  - `resolveTagIds(tx: TxClient, tags: TagInput[]): Promise<string[]>`
  - `type TxClient` —— `Parameters<Parameters<typeof prisma.$transaction>[0]>[0]` 的別名，讓兩支 route 都能傳自己的 `tx`

- [ ] **Step 1: 寫失敗測試**

`src/__tests__/lib/resolve-relations.test.ts`：

```ts
/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { resolveGameIds, resolveTagIds } from "@/lib/resolve-relations";

beforeEach(() => {
  resetPrismaMock();
});

describe("resolveGameIds", () => {
  it("reuses a game that already exists", async () => {
    prismaMock.game.findFirst.mockResolvedValue({ id: "game-1" });

    const ids = await resolveGameIds(prismaMock as never, ["Zelda"]);

    expect(ids).toEqual(["game-1"]);
    expect(prismaMock.game.create).not.toHaveBeenCalled();
  });

  it("creates a game that does not exist yet", async () => {
    prismaMock.game.findFirst.mockResolvedValue(null);
    prismaMock.game.create.mockResolvedValue({ id: "game-new" });

    const ids = await resolveGameIds(prismaMock as never, ["新遊戲"]);

    expect(ids).toEqual(["game-new"]);
    expect(prismaMock.game.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "新遊戲" }),
      })
    );
  });

  it("matches case-insensitively across all three name columns", async () => {
    prismaMock.game.findFirst.mockResolvedValue({ id: "game-1" });

    await resolveGameIds(prismaMock as never, ["zelda"]);

    expect(prismaMock.game.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: { equals: "zelda", mode: "insensitive" } },
          { nameEn: { equals: "zelda", mode: "insensitive" } },
          { nameOriginal: { equals: "zelda", mode: "insensitive" } },
        ],
      },
    });
  });

  it("keeps input order, so the caller can pick the first as primary", async () => {
    prismaMock.game.findFirst
      .mockResolvedValueOnce({ id: "a" })
      .mockResolvedValueOnce({ id: "b" });

    expect(await resolveGameIds(prismaMock as never, ["A", "B"])).toEqual(["a", "b"]);
  });
});

describe("resolveTagIds", () => {
  it("reuses a tag that already exists", async () => {
    prismaMock.tag.findFirst.mockResolvedValue({ id: "tag-1" });

    const ids = await resolveTagIds(prismaMock as never, [
      { name: "攻略", type: "GENERAL" },
    ]);

    expect(ids).toEqual(["tag-1"]);
    expect(prismaMock.tag.create).not.toHaveBeenCalled();
  });

  it("falls back to GENERAL for a type the enum does not know", async () => {
    prismaMock.tag.findFirst.mockResolvedValue(null);
    prismaMock.tag.create.mockResolvedValue({ id: "tag-new" });

    await resolveTagIds(prismaMock as never, [{ name: "X", type: "NONSENSE" }]);

    expect(prismaMock.tag.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "GENERAL" }),
      })
    );
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx jest src/__tests__/lib/resolve-relations.test.ts`
Expected: FAIL —— `Cannot find module '@/lib/resolve-relations'`

- [ ] **Step 3: 寫實作**

`src/lib/resolve-relations.ts`：

```ts
import { TagType } from "@prisma/client";
import type { prisma } from "./prisma";
import type { TagInput } from "./tag-input";

/**
 * The transaction client both callers hand in. Taken from $transaction rather
 * than named directly so it tracks whatever Prisma generates.
 */
export type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Names arrive from AI recognition and from hand-typed comma fields, so the
 * game or tag may not exist yet. Slug carries a timestamp suffix because two
 * different names can slugify to the same string once punctuation is stripped.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function resolveGameIds(
  tx: TxClient,
  names: string[]
): Promise<string[]> {
  const ids: string[] = [];

  for (const name of names) {
    const existing = await tx.game.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: "insensitive" } },
          { nameEn: { equals: name, mode: "insensitive" } },
          { nameOriginal: { equals: name, mode: "insensitive" } },
        ],
      },
    });

    if (existing) {
      ids.push(existing.id);
      continue;
    }

    const created = await tx.game.create({
      data: { name, slug: `${slugify(name)}-${Date.now()}` },
    });
    ids.push(created.id);
  }

  return ids;
}

export async function resolveTagIds(
  tx: TxClient,
  tags: TagInput[]
): Promise<string[]> {
  const ids: string[] = [];

  for (const tag of tags) {
    const existing = await tx.tag.findFirst({
      where: { name: { equals: tag.name, mode: "insensitive" } },
    });

    if (existing) {
      ids.push(existing.id);
      continue;
    }

    const type = Object.values(TagType).includes(tag.type as TagType)
      ? (tag.type as TagType)
      : TagType.GENERAL;

    const created = await tx.tag.create({
      data: { name: tag.name, slug: `${slugify(tag.name)}-${Date.now()}`, type },
    });
    ids.push(created.id);
  }

  return ids;
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx jest src/__tests__/lib/resolve-relations.test.ts`
Expected: PASS（6 支）

- [ ] **Step 5: 讓 batch route 改用 resolver**

`src/app/api/articles/batch/route.ts`：把迴圈裡 `suggestedGames` 與 `suggestedTags` 兩段（現在的 `:46-125`）換成：

```ts
      if (articleData.suggestedGames?.length) {
        const gameIds = await resolveGameIds(tx, articleData.suggestedGames);
        for (const [index, gameId] of gameIds.entries()) {
          await tx.articleGame.create({
            data: { articleId: article.id, gameId, isPrimary: index === 0 },
          });
        }
      }

      if (articleData.suggestedTags?.length) {
        const tagIds = await resolveTagIds(
          tx,
          articleData.suggestedTags.map((tag) =>
            typeof tag === "string" ? { name: tag, type: "GENERAL" } : tag
          )
        );
        for (const tagId of tagIds) {
          await tx.articleTag.create({ data: { articleId: article.id, tagId } });
        }
      }
```

import 改成 `import { resolveGameIds, resolveTagIds } from "@/lib/resolve-relations";`，並移除不再用到的 `TagType` import。

- [ ] **Step 6: 跑既有測試確認沒破壞**

Run: `npx jest src/__tests__/api/articles-batch.test.ts && npx tsc --noEmit`
Expected: 10 passed、型別無誤

- [ ] **Step 7: Commit**

```bash
git add src/lib/resolve-relations.ts src/__tests__/lib/resolve-relations.test.ts src/app/api/articles/batch/route.ts
git commit -m "refactor: share the find-or-create logic for games and tags"
```

---

### Task 2: batch route 改成可取代，並交出複查標記

**Files:**
- Modify: `src/app/api/articles/batch/route.ts`
- Modify: `src/lib/validators/article.ts:29-33`
- Modify: `src/__tests__/api/articles-batch.test.ts`
- Modify: `src/__tests__/__mocks__/prisma.ts:37-47`

**Interfaces:**
- Consumes: `resolveGameIds` / `resolveTagIds`（Task 1）
- Produces: `POST /api/articles/batch` 接受 `replaceExisting?: boolean`；不再接受 `confirmDuplicate`；不再寫 `tocReviewedAt`；回應維持 `{ success, count, articles }`，移除 `markedReviewed`

- [ ] **Step 1: 幫 prisma mock 補上 deleteMany**

`src/__tests__/__mocks__/prisma.ts`：`MockModel` 介面加 `deleteMany: jest.Mock;`，`createMockModel()` 加 `deleteMany: jest.fn(),`。

- [ ] **Step 2: 改寫測試**

`src/__tests__/api/articles-batch.test.ts`：刪掉「refuses to create a second copy…」與「creates anyway once the caller confirms」兩支，換成：

```ts
  it("replaces the issue's articles when asked to", async () => {
    prismaMock.issue.findUnique.mockResolvedValue({ id: "iss-1" });
    prismaMock.article.deleteMany.mockResolvedValue({ count: 14 });
    prismaMock.article.create.mockResolvedValue({ id: "art-1" });

    const res = await POST(
      makeRequest({
        issueId: "iss-1",
        replaceExisting: true,
        articles: [{ title: "A" }],
      })
    );

    expect(res.status).toBe(201);
    expect(prismaMock.article.deleteMany).toHaveBeenCalledWith({
      where: { issueId: "iss-1" },
    });
  });

  it("leaves existing articles alone when not asked to replace", async () => {
    prismaMock.issue.findUnique.mockResolvedValue({ id: "iss-1" });
    prismaMock.article.create.mockResolvedValue({ id: "art-1" });

    await POST(makeRequest({ issueId: "iss-1", articles: [{ title: "A" }] }));

    expect(prismaMock.article.deleteMany).not.toHaveBeenCalled();
  });

  // Recognition now lands before anyone has looked at it, so this route can no
  // longer claim the contents were reviewed. The issue page does that.
  it("never marks the issue as reviewed", async () => {
    prismaMock.issue.findUnique.mockResolvedValue({ id: "iss-1" });
    prismaMock.article.create.mockResolvedValue({ id: "art-1" });

    await POST(makeRequest({ issueId: "iss-1", articles: [{ title: "A" }] }));

    expect(prismaMock.issue.update).not.toHaveBeenCalled();
  });
```

- [ ] **Step 3: 跑測試確認失敗**

Run: `npx jest src/__tests__/api/articles-batch.test.ts`
Expected: FAIL —— `replaces the issue's articles when asked to` 因為 `deleteMany` 沒被呼叫，`never marks the issue as reviewed` 因為 `issue.update` 被呼叫了

- [ ] **Step 4: 改 validator**

`src/lib/validators/article.ts`：把 `confirmDuplicate` 換成

```ts
  // 重跑辨識時，取代整期的文章。不帶就是單純附加（匯入腳本靠這個行為）。
  replaceExisting: z.boolean().optional(),
```

- [ ] **Step 5: 改 route**

`src/app/api/articles/batch/route.ts`：

1. `findUnique` 的 `include: { _count: ... }` 拿掉，回到單純 `where`
2. 刪掉整段 409 檢查
3. transaction 開頭加上：

```ts
    // 重跑辨識時整期換掉。關聯是 cascade，所以標籤與遊戲的連結會一併消失 --
    // 呼叫端的確認對話框要講清楚這件事。
    if (validatedData.replaceExisting) {
      await tx.article.deleteMany({ where: { issueId: validatedData.issueId } });
    }
```

4. 刪掉 `isHuman` / `markedReviewed` / `issue.update` / 那筆 `logEdit("Issue", ...)`（現在的 `:140-155`），連同 `isValidApiToken` 的 import
5. 回應改成 `{ success: true, count: result.length, articles: result }`

- [ ] **Step 6: 跑測試確認通過**

Run: `npx jest src/__tests__/api/articles-batch.test.ts && npx tsc --noEmit`
Expected: PASS（11 支）。`OcrPageClient` 這時會因為 `markedReviewed` 不存在而型別報錯 —— Task 7 會處理，若 tsc 只剩這一個錯誤就繼續。

- [ ] **Step 7: Commit**

```bash
git add src/app/api/articles/batch/route.ts src/lib/validators/article.ts src/__tests__/api/articles-batch.test.ts src/__tests__/__mocks__/prisma.ts
git commit -m "feat: let batch create replace an issue's articles"
```

---

### Task 3: 單篇更新支援以名稱設定關聯

**Files:**
- Modify: `src/app/api/articles/[id]/route.ts:48-130`
- Test: `src/__tests__/api/articles-id.test.ts`（新建）

**Interfaces:**
- Consumes: `resolveGameIds` / `resolveTagIds`（Task 1）
- Produces: `PUT /api/articles/[id]` 額外接受 `games?: string[]`（遊戲名稱）與 `tags?: { name: string; type: string }[]`；與 `gameIds`／`tagIds` 同時出現時回 400

- [ ] **Step 1: 寫失敗測試**

`src/__tests__/api/articles-id.test.ts`：

```ts
/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { PUT } from "@/app/api/articles/[id]/route";
import { NextRequest } from "next/server";

beforeEach(() => {
  resetPrismaMock();
  prismaMock.article.findUnique.mockResolvedValue({
    id: "art-1",
    title: "舊標題",
    articleGames: [],
    articleTags: [],
  });
  prismaMock.article.update.mockResolvedValue({ id: "art-1", title: "新標題" });
  prismaMock.articleGame.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.articleGame.createMany.mockResolvedValue({ count: 1 });
  prismaMock.articleTag.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.articleTag.createMany.mockResolvedValue({ count: 1 });
});

function makeRequest(body: object) {
  return new NextRequest(new URL("http://localhost:3000/api/articles/art-1"), {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ id: "art-1" }) };

describe("PUT /api/articles/[id]", () => {
  it("resolves game names into associations, creating what is missing", async () => {
    prismaMock.game.findFirst.mockResolvedValue(null);
    prismaMock.game.create.mockResolvedValue({ id: "game-new" });

    const res = await PUT(makeRequest({ games: ["新遊戲"] }), context as never);

    expect(res.status).toBe(200);
    expect(prismaMock.articleGame.createMany).toHaveBeenCalledWith({
      data: [{ articleId: "art-1", gameId: "game-new", isPrimary: true }],
    });
  });

  it("resolves tag names into associations", async () => {
    prismaMock.tag.findFirst.mockResolvedValue({ id: "tag-1" });

    const res = await PUT(
      makeRequest({ tags: [{ name: "攻略", type: "GENERAL" }] }),
      context as never
    );

    expect(res.status).toBe(200);
    expect(prismaMock.articleTag.createMany).toHaveBeenCalledWith({
      data: [{ articleId: "art-1", tagId: "tag-1" }],
    });
  });

  it("clears the associations when given an empty list", async () => {
    await PUT(makeRequest({ games: [] }), context as never);

    expect(prismaMock.articleGame.deleteMany).toHaveBeenCalledWith({
      where: { articleId: "art-1" },
    });
    expect(prismaMock.articleGame.createMany).not.toHaveBeenCalled();
  });

  // Two ways to say the same thing, with different outcomes if they disagree.
  it("refuses ids and names in the same request", async () => {
    const res = await PUT(
      makeRequest({ games: ["A"], gameIds: ["game-1"] }),
      context as never
    );

    expect(res.status).toBe(400);
    expect(prismaMock.article.update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 補 prisma mock 的 createMany**

`src/__tests__/__mocks__/prisma.ts`：`MockModel` 加 `createMany: jest.Mock;`，`createMockModel()` 加 `createMany: jest.fn(),`。

- [ ] **Step 3: 跑測試確認失敗**

Run: `npx jest src/__tests__/api/articles-id.test.ts`
Expected: FAIL —— 名稱版欄位還沒實作，`games` 會被當成未知欄位忽略

- [ ] **Step 4: 改 route**

`src/app/api/articles/[id]/route.ts` 的 PUT：

```ts
  const { gameIds, tagIds, games, tags, ...articleData } = body;

  // 兩種寫法只能擇一 -- 同時給而內容不一致時，沒有哪一邊該贏。
  if ((games !== undefined && gameIds !== undefined) ||
      (tags !== undefined && tagIds !== undefined)) {
    return NextResponse.json(
      { error: "關聯只能以 id 或名稱其中一種方式設定" },
      { status: 400 }
    );
  }
```

transaction 內，把 `gameIds`／`tagIds` 兩段改成先解析再寫：

```ts
    const resolvedGameIds =
      games !== undefined ? await resolveGameIds(tx, games) : gameIds;

    if (resolvedGameIds !== undefined) {
      await tx.articleGame.deleteMany({ where: { articleId: id } });
      if (resolvedGameIds.length > 0) {
        await tx.articleGame.createMany({
          data: resolvedGameIds.map((gameId: string, index: number) => ({
            articleId: id,
            gameId,
            isPrimary: index === 0,
          })),
        });
      }
    }

    const resolvedTagIds =
      tags !== undefined ? await resolveTagIds(tx, tags) : tagIds;

    if (resolvedTagIds !== undefined) {
      await tx.articleTag.deleteMany({ where: { articleId: id } });
      if (resolvedTagIds.length > 0) {
        await tx.articleTag.createMany({
          data: resolvedTagIds.map((tagId: string) => ({ articleId: id, tagId })),
        });
      }
    }
```

transaction 之後的編輯紀錄，把 `gameIds !== undefined` 改成 `resolvedGameIds !== undefined`、`tagIds` 同理，並用解析後的 id 算 diff。因為 `resolvedGameIds` 宣告在 transaction 內，把它們提到 transaction 外層宣告（`let resolvedGameIds: string[] | undefined`）再於內部指派。

- [ ] **Step 5: 跑測試確認通過**

Run: `npx jest src/__tests__/api/articles-id.test.ts src/__tests__/api/articles.test.ts && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/api/articles/[id]/route.ts src/__tests__/api/articles-id.test.ts src/__tests__/__mocks__/prisma.ts
git commit -m "feat: accept game and tag names when updating an article"
```

---

### Task 4: 抽出 TocImageViewer

**Files:**
- Create: `src/components/issue/TocImageViewer.tsx`
- Test: `src/__tests__/components/TocImageViewer.test.tsx`

**Interfaces:**
- Produces: `<TocImageViewer images={string[]} />` —— 圖為空時回傳 `null`；自帶 sticky 容器、切換控制與全螢幕 lightbox

- [ ] **Step 1: 寫失敗測試**

`src/__tests__/components/TocImageViewer.test.tsx`：

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TocImageViewer } from "@/components/issue/TocImageViewer";

describe("TocImageViewer", () => {
  it("renders nothing without images", () => {
    const { container } = render(<TocImageViewer images={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the first page and no pager for a single image", () => {
    render(<TocImageViewer images={["/a.jpg"]} />);

    expect(screen.getByAltText("目錄頁 1")).toHaveAttribute("src", "/a.jpg");
    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument();
  });

  it("pages through multiple images", async () => {
    const user = userEvent.setup();
    render(<TocImageViewer images={["/a.jpg", "/b.jpg"]} />);

    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "下一頁" }));

    expect(screen.getByAltText("目錄頁 2")).toHaveAttribute("src", "/b.jpg");
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx jest src/__tests__/components/TocImageViewer.test.tsx`
Expected: FAIL —— `Cannot find module '@/components/issue/TocImageViewer'`

- [ ] **Step 3: 寫實作**

`src/components/issue/TocImageViewer.tsx`：把 `OcrResultEditor.tsx:560-625`（sticky 圖片欄）與 `:678-736`（lightbox）整段搬過來，**連同解釋 sticky 高度與 `max-h` 為什麼這樣寫的兩段註解一起搬** —— 那是踩過坑才留下的。元件自己持有 `currentImageIndex` 與 `isZoomed` 兩個 state。

翻頁按鈕原本只有圖示，測試要靠名字點得到，所以補 `aria-label="上一頁"` / `aria-label="下一頁"`；`1 / 2` 那段文字只在 `images.length > 1` 時渲染（維持原行為）。外層 `w-2/5 shrink-0` 留給呼叫端決定，元件本身從 `sticky top-4 ...` 那層開始。

- [ ] **Step 4: 跑測試確認通過**

Run: `npx jest src/__tests__/components/TocImageViewer.test.tsx`
Expected: PASS（3 支）

- [ ] **Step 5: Commit**

```bash
git add src/components/issue/TocImageViewer.tsx src/__tests__/components/TocImageViewer.test.tsx
git commit -m "refactor: extract the TOC image viewer from the OCR editor"
```

---

### Task 5: 行內編輯補上摘要、遊戲與標籤

**Files:**
- Create: `src/components/ui/comma-list-input.tsx`
- Modify: `src/components/ocr/OcrResultEditor.tsx`（改成 import 搬走的 `CommaListInput`）
- Modify: `src/components/article/EditableArticleRow.tsx`
- Modify: `src/components/article/ArticleListClient.tsx:154-169`
- Test: `src/__tests__/components/EditableArticleRow.test.tsx`（新建）

**Interfaces:**
- Consumes: `formatTagInput` / `parseTagInput` from `src/lib/tag-input.ts`
- Produces:
  - `<CommaListInput value format parse onChange onEscape />`（泛型，從 `OcrResultEditor` 原封搬出）
  - `formatStringList(value?: string[]): string`、`parseStringList(text: string): string[]`
  - `ArticleItem` 增加 `summary: string | null`、`articleTags: Array<{ tag: { id: string; name: string; type: string } }>`
  - `ArticleUpdatePayload` 增加 `summary: string | null`、`games: string[]`、`tags: TagInput[]`

- [ ] **Step 1: 把 CommaListInput 搬成共用元件**

新增 `src/components/ui/comma-list-input.tsx`，把 `OcrResultEditor.tsx` 裡的 `CommaListInput`、`formatStringList`、`parseStringList` 三個原封搬過去並 export（含那段「為什麼要自己留文字」的註解）。`OcrResultEditor.tsx` 改成 import。

Run: `npx jest src/__tests__/components/OcrResultEditor.test.tsx`
Expected: PASS（3 支，行為不變）

- [ ] **Step 2: 寫失敗測試**

`src/__tests__/components/EditableArticleRow.test.tsx`：

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditableArticleRow } from "@/components/article/EditableArticleRow";

const article = {
  id: "art-1",
  title: "功夫",
  subtitle: null,
  authors: ["王大明"],
  category: null,
  pageStart: 68,
  pageEnd: null,
  summary: "一篇攻略",
  articleGames: [{ game: { id: "g1", name: "功夫小子" } }],
  articleTags: [{ tag: { id: "t1", name: "攻略", type: "GENERAL" } }],
};

function renderRow(onSaveEdit = jest.fn().mockResolvedValue(undefined)) {
  render(
    <EditableArticleRow
      article={article}
      isEditing
      onStartEdit={jest.fn()}
      onSaveEdit={onSaveEdit}
      onCancelEdit={jest.fn()}
      onDelete={jest.fn()}
    />
  );
  return onSaveEdit;
}

describe("EditableArticleRow", () => {
  it("sends games and tags by name when saving", async () => {
    const user = userEvent.setup();
    const onSaveEdit = renderRow();

    await user.click(screen.getByRole("button", { name: /儲存/ }));

    expect(onSaveEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: "一篇攻略",
        games: ["功夫小子"],
        tags: [{ name: "攻略", type: "GENERAL" }],
      })
    );
  });

  it("keeps a typed comma in the games field", async () => {
    const user = userEvent.setup();
    renderRow();

    const games = screen.getByDisplayValue("功夫小子");
    await user.type(games, ", 功夫小子2");

    expect(games).toHaveValue("功夫小子, 功夫小子2");
  });

  it("carries an edited summary into the payload", async () => {
    const user = userEvent.setup();
    const onSaveEdit = renderRow();

    await user.clear(screen.getByDisplayValue("一篇攻略"));
    await user.type(screen.getByLabelText("摘要"), "改過的摘要");
    await user.click(screen.getByRole("button", { name: /儲存/ }));

    expect(onSaveEdit).toHaveBeenCalledWith(
      expect.objectContaining({ summary: "改過的摘要" })
    );
  });
});
```

摘要欄位要能被 `getByLabelText("摘要")` 找到，所以那個 `Label` 必須帶 `htmlFor` 並與 `Textarea` 的 `id` 對上（`id={`summary-${article.id}`}`）。

- [ ] **Step 3: 跑測試確認失敗**

Run: `npx jest src/__tests__/components/EditableArticleRow.test.tsx`
Expected: FAIL —— payload 沒有 `summary`／`games`／`tags`，也找不到摘要欄位

- [ ] **Step 4: 改 EditableArticleRow**

1. `ArticleItem` 加 `summary: string | null` 與 `articleTags`
2. `ArticleUpdatePayload` 加 `summary: string | null`、`games: string[]`、`tags: TagInput[]`
3. state 加 `gamesDraft`（`string[]`，初值 `article.articleGames.map((ag) => ag.game.name)`）與 `tagsDraft`（`TagInput[]`，初值 `article.articleTags.map((at) => ({ name: at.tag.name, type: at.tag.type }))`），`handleStartEdit` 一併重設
4. 編輯區塊把現在唯讀的遊戲區（`:206-219`）換成兩個 `CommaListInput`：

```tsx
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">相關遊戲（逗號分隔）</Label>
            <CommaListInput
              value={gamesDraft}
              format={formatStringList}
              parse={parseStringList}
              onChange={setGamesDraft}
              onEscape={onCancelEdit}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              標籤（逗號分隔，格式：名稱 或 類型:名稱）
            </Label>
            <CommaListInput
              value={tagsDraft}
              format={formatTagInput}
              parse={parseTagInput}
              onChange={setTagsDraft}
              onEscape={onCancelEdit}
            />
            {tagsDraft.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {tagsDraft.map((tag, i) => (
                  <TagChip key={i} tag={tag} withTypeLabel className="text-xs" />
                ))}
              </div>
            )}
          </div>
        </div>
```

5. 摘要欄位（放在遊戲/標籤下方）：

```tsx
        <div className="space-y-1">
          <Label className="text-xs" htmlFor={`summary-${article.id}`}>摘要</Label>
          <Textarea
            id={`summary-${article.id}`}
            value={formData.summary ?? ""}
            onChange={(e) =>
              setFormData({ ...formData, summary: e.target.value || null })
            }
            rows={2}
            onKeyDown={handleKeyDown}
          />
        </div>
```

6. `handleSave` 送出 `{ ...formData, authors, games: gamesDraft, tags: tagsDraft }`
7. 唯讀列（`:287-299`）補上標籤 chip，排在遊戲 chip 之後

- [ ] **Step 5: 讓列表把新欄位送到 API**

`src/components/article/ArticleListClient.tsx` 的 `handleSaveEdit` 原樣把 payload 丟給 `PUT /api/articles/[id]` —— `games`／`tags` 會直接進 Task 3 的名稱路徑，不需要改。**要改的是資料來源**：單期編輯頁的 query 目前只 include `articleGames`，Task 6 會補上 `articleTags` 與 `summary`。

- [ ] **Step 6: 跑測試確認通過**

Run: `npx jest src/__tests__/components/EditableArticleRow.test.tsx && npx tsc --noEmit`
Expected: PASS（3 支）。`tsc` 這時會抱怨單期編輯頁傳進來的 `articles` 少了 `summary`／`articleTags` —— Task 6 補上。

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/comma-list-input.tsx src/components/article/EditableArticleRow.tsx src/components/ocr/OcrResultEditor.tsx src/__tests__/components/EditableArticleRow.test.tsx
git commit -m "feat: edit summary, games and tags inline in the article list"
```

---

### Task 6: 單期編輯頁改成雙欄，並加上複查標記

**Files:**
- Modify: `src/app/(admin)/admin/magazines/[id]/issues/[issueId]/page.tsx:24-38, 128-141`
- Modify: `src/components/article/ArticleListClient.tsx`
- Test: `src/__tests__/components/ArticleListClient.test.tsx`（新建）

**Interfaces:**
- Consumes: `<TocImageViewer images />`（Task 4）、`EditableArticleRow`（Task 5）
- Produces: `<ArticleListClient articles issueId magazineId tocImages tocReviewed />`

- [ ] **Step 1: 寫失敗測試**

`src/__tests__/components/ArticleListClient.test.tsx`：

```tsx
import { render, screen } from "@testing-library/react";
import { ArticleListClient } from "@/components/article/ArticleListClient";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}));

const articles = [
  {
    id: "art-1",
    title: "功夫",
    subtitle: null,
    authors: [],
    category: null,
    pageStart: 68,
    pageEnd: null,
    summary: null,
    articleGames: [],
    articleTags: [],
  },
];

describe("ArticleListClient", () => {
  it("shows the scan beside the list when the issue has TOC images", () => {
    render(
      <ArticleListClient
        articles={articles}
        issueId="iss-1"
        magazineId="mag-1"
        tocImages={["/toc.jpg"]}
        tocReviewed={false}
      />
    );

    expect(screen.getByAltText("目錄頁 1")).toBeInTheDocument();
  });

  it("renders the list alone when there is no scan", () => {
    render(
      <ArticleListClient
        articles={articles}
        issueId="iss-1"
        magazineId="mag-1"
        tocImages={[]}
        tocReviewed={false}
      />
    );

    expect(screen.queryByAltText("目錄頁 1")).not.toBeInTheDocument();
  });

  it("offers to mark an unreviewed issue as reviewed", () => {
    render(
      <ArticleListClient
        articles={articles}
        issueId="iss-1"
        magazineId="mag-1"
        tocImages={[]}
        tocReviewed={false}
      />
    );

    expect(screen.getByText(/本期尚未複查/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "標記為已複查" })
    ).toBeInTheDocument();
  });

  it("says nothing once the issue has been reviewed", () => {
    render(
      <ArticleListClient
        articles={articles}
        issueId="iss-1"
        magazineId="mag-1"
        tocImages={[]}
        tocReviewed
      />
    );

    expect(screen.queryByText(/本期尚未複查/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx jest src/__tests__/components/ArticleListClient.test.tsx`
Expected: FAIL —— props 不存在、圖與橫幅都沒渲染

- [ ] **Step 3: 改 ArticleListClient**

1. props 加 `tocImages: string[]` 與 `tocReviewed: boolean`
2. `CardContent` 內容包成雙欄：

```tsx
          <div className="flex gap-6">
            {tocImages.length > 0 && (
              <div className="w-2/5 shrink-0">
                <TocImageViewer images={tocImages} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              {/* 既有的 empty state / DndContext / BatchArticleForm 原封放這裡 */}
            </div>
          </div>
```

3. 未複查橫幅，放在 `CardContent` 最上方：

```tsx
          {!tocReviewed && (
            <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <span>本期尚未複查，請對照目錄頁逐篇確認</span>
              <Button size="sm" onClick={handleMarkReviewed} disabled={isMarking}>
                標記為已複查
              </Button>
            </div>
          )}
```

4. `handleMarkReviewed`：

```tsx
  const handleMarkReviewed = async () => {
    setIsMarking(true);
    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tocReviewed: true }),
      });
      if (!res.ok) throw new Error();
      toast.success("已標記為完成複查");
      router.refresh();
    } catch {
      toast.error("標記失敗");
    } finally {
      setIsMarking(false);
    }
  };
```

送出前先確認 `PUT /api/issues/[id]` 收的是 `tocReviewed` 布林值（見 `src/app/api/issues/[id]/route.ts:61-67`）；若欄位名不同，以 route 為準。

- [ ] **Step 4: 改單期編輯頁**

`page.tsx` 的 query 補上 `articleTags`：

```ts
      articles: {
        orderBy: { sortOrder: "asc" },
        include: {
          articleGames: {
            include: { game: { select: { id: true, name: true } } },
          },
          articleTags: {
            include: { tag: { select: { id: true, name: true, type: true } } },
          },
        },
      },
```

底部改成：

```tsx
      <ArticleListClient
        articles={issue.articles}
        issueId={issue.id}
        magazineId={id}
        tocImages={issue.tocImages}
        tocReviewed={issue.tocReviewedAt !== null}
      />
```

- [ ] **Step 5: 跑測試確認通過**

Run: `npx jest src/__tests__/components/ArticleListClient.test.tsx && npx tsc --noEmit`
Expected: PASS（4 支）、型別無誤

- [ ] **Step 6: Commit**

```bash
git add "src/app/(admin)/admin/magazines/[id]/issues/[issueId]/page.tsx" src/components/article/ArticleListClient.tsx src/__tests__/components/ArticleListClient.test.tsx
git commit -m "feat: review the TOC scan alongside the article list"
```

---

### Task 7: 在此列上／下插入

**Files:**
- Modify: `src/components/article/EditableArticleRow.tsx`
- Modify: `src/components/article/ArticleListClient.tsx`
- Modify: `src/__tests__/components/ArticleListClient.test.tsx`

**Interfaces:**
- Produces: `EditableArticleRow` 新增 `onInsert: (position: "before" | "after") => void`

- [ ] **Step 1: 寫失敗測試**

在 `ArticleListClient.test.tsx` 追加：

```tsx
  it("creates a blank article at the requested position", async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "art-new" }),
    }) as unknown as typeof fetch;

    render(
      <ArticleListClient
        articles={articles}
        issueId="iss-1"
        magazineId="mag-1"
        tocImages={[]}
        tocReviewed
      />
    );

    await user.click(screen.getByTitle("在此列上方新增文章"));

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/articles",
      expect.objectContaining({ method: "POST" })
    );
  });
```

檔案頂端補 `import userEvent from "@testing-library/user-event";`。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx jest src/__tests__/components/ArticleListClient.test.tsx`
Expected: FAIL —— 找不到 `在此列上方新增文章`

- [ ] **Step 3: 實作**

`EditableArticleRow` 唯讀列的 hover 動作區（`:302-327`）加兩顆按鈕，樣式與 title 照 `OcrResultEditor.tsx:346-372` 搬（`BetweenHorizontalStart` + `ArrowUp`／`ArrowDown`，`title="在此列上方新增文章"`／`"在此列下方新增文章"`，`onClick` 要 `e.stopPropagation()`）。

`ArticleListClient` 加：

```tsx
  const handleInsert = async (index: number, position: "before" | "after") => {
    const at = position === "before" ? index : index + 1;
    // 標題必填，所以先給一個看得出是待填的暫名。
    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueId, title: "（未命名）", sortOrder: at }),
    });
    if (!res.ok) {
      toast.error("新增失敗");
      return;
    }
    const created = await res.json();
    const next = [...articles];
    next.splice(at, 0, { ...created, articles: [], articleGames: [], articleTags: [] });
    await saveOrder(next);
    setEditingId(created.id);
  };
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx jest src/__tests__/components/ArticleListClient.test.tsx && npx tsc --noEmit`
Expected: PASS（5 支）

- [ ] **Step 5: Commit**

```bash
git add src/components/article/EditableArticleRow.tsx src/components/article/ArticleListClient.tsx src/__tests__/components/ArticleListClient.test.tsx
git commit -m "feat: insert an article above or below a row"
```

---

### Task 8: /admin/ocr 交棒，OcrResultEditor 退場

**Files:**
- Modify: `src/app/(admin)/admin/ocr/OcrPageClient.tsx`
- Delete: `src/components/ocr/OcrResultEditor.tsx`
- Delete: `src/__tests__/components/OcrResultEditor.test.tsx`
- Modify: `src/app/(admin)/admin/magazines/[id]/issues/[issueId]/page.tsx:86-104`（AI 辨識卡片文案）

**Interfaces:**
- Consumes: `POST /api/articles/batch` 的 `replaceExisting`（Task 2）

- [ ] **Step 1: 改 OcrPageClient 的交棒流程**

辨識成功的 `handleOcrResult` 改成 async，直接落地：

```tsx
  const landArticles = async (result: OcrResult, replaceExisting: boolean) => {
    const response = await fetch("/api/articles/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issueId: selectedIssueId,
        ...(replaceExisting && { replaceExisting: true }),
        articles: result.articles.map((article, index) => ({
          title: article.title,
          subtitle: article.subtitle,
          authors: article.authors || [],
          category: article.category,
          pageStart: article.pageStart,
          pageEnd: article.pageEnd,
          summary: article.summary,
          sortOrder: index,
          suggestedGames: article.suggestedGames,
          suggestedTags: article.suggestedTags?.map((t) =>
            typeof t === "string" ? { name: t, type: "GENERAL" } : t
          ),
        })),
      }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "儲存失敗");
    }
    router.push(
      `/admin/magazines/${selectedMagazineId}/issues/${selectedIssueId}`
    );
  };
```

`handleOcrResult(result)`：先查該期現有文章數（`GET /api/articles?issueId=<id>&limit=1` 回應的 `pagination.total`），大於 0 就跳確認：

```tsx
      const proceed = confirm(
        `這期已經有 ${existing} 篇文章。\n\n` +
          "繼續會以這次的辨識結果「取代」它們，既有文章連同標籤與遊戲關聯都會刪除。\n" +
          "取消的話，辨識結果仍留在紀錄裡，之後可以再載入。"
      );
      if (!proceed) return;
```

- [ ] **Step 2: 拿掉複查 UI**

`OcrPageClient` 刪掉：`OcrResultEditor` 的 import 與渲染、`loadSavedResult` 與相關 state（`ocrResult`、`loadedAt`、`isLoadingSaved`、`isSaved`、`markedReviewed`）、`handleSave`／`handleCancel`／`handleRerun`、以及「已存的辨識結果」與成功訊息兩個區塊。畫面剩下：選期刊／單期 + `OcrUploader`。

- [ ] **Step 3: 刪除 OcrResultEditor**

```bash
rm src/components/ocr/OcrResultEditor.tsx src/__tests__/components/OcrResultEditor.test.tsx
```

（`rm` 在本機是 `trash`，可從垃圾桶救回。）

- [ ] **Step 4: 改單期編輯頁的 AI 辨識卡片文案**

`savedOcr` 存在時的描述與按鈕不該再說「尚待複查／複查辨識結果」—— 複查現在就在這一頁。改成：

- 描述：`已於 <時間> 辨識完成` / `上傳目錄頁圖片，使用 AI 自動辨識文章資訊`
- 按鈕：`重新辨識` / `開始辨識`
- 底部說明文字同步改掉「點擊『複查辨識結果』確認後建立文章」那句

- [ ] **Step 5: 全跑一次**

Run: `npx jest && npx tsc --noEmit && npx eslint src`
Expected: 全綠。若有測試引用已刪除的元件，一併移除。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: land recognition results straight into the issue's articles"
```

---

### Task 9: 文件更新

**Files:**
- Modify: `docs/features.md:24-32`
- Modify: `docs/routes.md:43`
- Modify: `BACKLOG.md`

- [ ] **Step 1: 改 features.md**

「複查編輯器」整段重寫：複查落在單期編輯頁、左目錄圖右文章列表、行內可改摘要與遊戲標籤、`tocReviewedAt` 由人手動標記、重跑辨識是取代整期。拿掉 2026-08-16 加的 409／`confirmDuplicate` 段落。

- [ ] **Step 2: 改 routes.md**

`/admin/ocr` 的說明從「AI 目錄辨識與複查」改成「AI 目錄辨識（上傳與辨識，結果直接寫入該期文章）」。

- [ ] **Step 3: 改 BACKLOG.md**

- 刪掉「複查與文章列表編輯合而為一」那條（做完了）
- 「三個檔案超過 650 行」那條把 `OcrResultEditor.tsx` 拿掉（已刪除），保留另外兩個並更新行數

- [ ] **Step 4: Commit**

```bash
git add docs/features.md docs/routes.md BACKLOG.md
git commit -m "docs: describe the unified TOC editing flow"
```

---

## Self-Review

**Spec 覆蓋：**

| Spec 段落 | Task |
|---|---|
| Feature 1 辨識後落地 / 取代或取消 | 2、8 |
| Feature 1 tocReviewedAt 改手動 | 2（移除自動）、6（加手動入口） |
| Feature 2 TocImageViewer | 4、6 |
| Feature 2 EditableArticleRow 補欄位 | 5 |
| Feature 2 插入列 | 7 |
| Feature 3 resolve-relations | 1 |
| Feature 3 PUT 名稱版關聯 | 3 |
| Feature 3 batch replaceExisting / 移除 confirmDuplicate | 2 |
| Testing 表 | 各 task 內 |
| Docs | 9 |

**已知的跨 task 暫時性錯誤**（照順序執行就會自行消解）：Task 2 之後 `OcrPageClient` 會因 `markedReviewed` 消失而型別報錯，Task 8 修掉；Task 5 之後單期編輯頁的 `articles` 型別會缺 `summary`／`articleTags`，Task 6 補上。
