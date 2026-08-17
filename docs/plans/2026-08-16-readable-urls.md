# Readable URLs (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 `/games/[id]` 與 `/tags/[id]` 改吃可讀的中文 slug，舊的 cuid 網址永久轉址過去。

**Architecture:** 新增 `src/lib/slugify.ts`（NFKC 正規化 + 唯一性後綴），取代 `resolve-relations.ts` 裡的時間戳做法；兩個公開詳情頁改成「先查 slug、找不到再查 id 並轉址」；一支進版控的腳本回填既有的 397 + 162 筆。

**Tech Stack:** Next.js 15 App Router、Prisma、jest、TypeScript

**Spec:** `docs/plans/2026-08-16-readable-urls-design.md`

## Global Constraints

- 註解、變數命名、commit message 一律英文；UI 文案繁體中文
- Conventional Commits；TDD：先寫失敗測試
- `npx jest <path>` / `npx tsc --noEmit` / `npx eslint <paths>`
- **不動 schema**——`slug` 欄位與 validator 的中文規則都已存在
- 後台網址維持 cuid，不在本次範圍

---

### Task 1: slugify 與唯一性

**Files:**
- Create: `src/lib/slugify.ts`
- Test: `src/__tests__/lib/slugify.test.ts`

**Interfaces:**
- Produces:
  - `slugify(name: string): string`
  - `ensureUniqueSlug(tx: TxClient, model: "game" | "tag", base: string, excludeId?: string): Promise<string>`
- Consumes: `TxClient` from `src/lib/resolve-relations.ts`

- [ ] **Step 1: 寫失敗測試**

```ts
/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { ensureUniqueSlug, slugify } from "@/lib/slugify";

beforeEach(() => resetPrismaMock());

describe("slugify", () => {
  it("keeps CJK as-is", () => {
    expect(slugify("棒球聯盟")).toBe("棒球聯盟");
  });

  // 這正是 宇宙傳奇Ⅱ 與 宇宙傳奇Ⅲ 撞成同一個 slug 的原因。
  it("normalises Roman numerals so sequels stay distinct", () => {
    expect(slugify("宇宙傳奇Ⅱ")).toBe("宇宙傳奇ii");
    expect(slugify("宇宙傳奇Ⅲ")).toBe("宇宙傳奇iii");
  });

  it("folds full-width characters", () => {
    expect(slugify("Ｐ－４７")).toBe("p-47");
  });

  it("lowercases and turns punctuation into a single hyphen", () => {
    expect(slugify("Ghostbusters II")).toBe("ghostbusters-ii");
    expect(slugify("P.47")).toBe("p-47");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("《三國志》")).toBe("三國志");
  });

  it("returns an empty string when nothing survives", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("ensureUniqueSlug", () => {
  it("uses the base when it is free", async () => {
    prismaMock.game.findFirst.mockResolvedValue(null);

    expect(await ensureUniqueSlug(prismaMock as never, "game", "功夫")).toBe("功夫");
  });

  it("appends a counter when the base is taken", async () => {
    prismaMock.game.findFirst
      .mockResolvedValueOnce({ id: "other" })
      .mockResolvedValueOnce({ id: "another" })
      .mockResolvedValueOnce(null);

    expect(await ensureUniqueSlug(prismaMock as never, "game", "p-47")).toBe("p-47-3");
  });

  it("does not collide with the row being updated", async () => {
    prismaMock.tag.findFirst.mockResolvedValue(null);

    await ensureUniqueSlug(prismaMock as never, "tag", "攻略", "tag-1");

    expect(prismaMock.tag.findFirst).toHaveBeenCalledWith({
      where: { slug: "攻略", NOT: { id: "tag-1" } },
      select: { id: true },
    });
  });
});
```

- [ ] **Step 2: 跑測試確認失敗** — `npx jest src/__tests__/lib/slugify.test.ts`，預期 `Cannot find module`

- [ ] **Step 3: 實作**

```ts
import type { TxClient } from "./resolve-relations";

/**
 * NFKC first, so the characters that carry meaning survive the strip.
 *
 * 宇宙傳奇Ⅱ and 宇宙傳奇Ⅲ used to produce the same slug: U+2161/U+2162 are
 * outside the allowed range and were dropped as punctuation. NFKC turns them
 * into plain "II"/"III", and folds full-width forms while it is at it.
 */
export function slugify(name: string): string {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * The first free variant of `base`: base, base-2, base-3...
 *
 * Replaces the timestamp suffix the OCR path used to append. A timestamp
 * guarantees uniqueness but makes every slug unreadable, and the measured
 * collision rate on production is 2 in 397.
 */
export async function ensureUniqueSlug(
  tx: TxClient,
  model: "game" | "tag",
  base: string,
  excludeId?: string
): Promise<string> {
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const taken = await tx[model].findFirst({
      where: {
        slug: candidate,
        ...(excludeId && { NOT: { id: excludeId } }),
      },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
}
```

- [ ] **Step 4: 跑測試確認通過**（9 支）

- [ ] **Step 5: Commit** — `feat: generate readable slugs instead of timestamped ones`

---

### Task 2: resolve-relations 改用新規則

**Files:**
- Modify: `src/lib/resolve-relations.ts`
- Modify: `src/__tests__/lib/resolve-relations.test.ts`

- [ ] **Step 1: 改測試**

把「creates a game that does not exist yet」的斷言加嚴，並新增一支：

```ts
  it("gives a new game a readable slug, with no timestamp", async () => {
    prismaMock.game.findFirst.mockResolvedValue(null);
    prismaMock.game.create.mockResolvedValue({ id: "game-new" });

    await resolveGameIds(prismaMock as never, ["宇宙傳奇Ⅱ"]);

    expect(prismaMock.game.create).toHaveBeenCalledWith({
      data: { name: "宇宙傳奇Ⅱ", slug: "宇宙傳奇ii" },
    });
  });
```

注意 `resolveGameIds` 內部的 `findFirst` 現在會被呼叫兩次（一次找遊戲、一次由 `ensureUniqueSlug` 查 slug），mock 要都回 null。

- [ ] **Step 2: 跑測試確認失敗**（slug 仍帶時間戳）

- [ ] **Step 3: 實作** — 移除 `slugify()` 私有函式與 `Date.now()`，改 import `slugify` 與 `ensureUniqueSlug`：

```ts
      slug: await ensureUniqueSlug(tx, "game", slugify(name) || "game"),
```

名稱只有符號時 `slugify` 回空字串，退回 `"game"`／`"tag"`，讓唯一性後綴接手。

- [ ] **Step 4: 跑測試確認通過** — `npx jest src/__tests__/lib/resolve-relations.test.ts src/__tests__/api/articles-batch.test.ts`

- [ ] **Step 5: Commit** — `refactor: build auto-created slugs from the shared rule`

---

### Task 3: 詳情頁改吃 slug

**Files:**
- Modify: `src/app/(public)/games/[id]/page.tsx`
- Modify: `src/app/(public)/tags/[id]/page.tsx`
- Test: `src/__tests__/lib/slug-lookup.test.ts`
- Create: `src/lib/slug-lookup.ts`

**Interfaces:**
- Produces: `resolveSlugParam(model, param)` 回 `{ id, slug } | null` —— 頁面用它決定要渲染還是轉址

- [ ] **Step 1: 寫失敗測試**

```ts
/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { resolveSlugParam } from "@/lib/slug-lookup";

beforeEach(() => resetPrismaMock());

describe("resolveSlugParam", () => {
  it("matches on slug first", async () => {
    prismaMock.game.findUnique.mockResolvedValueOnce({ id: "g1", slug: "功夫" });

    expect(await resolveSlugParam("game", "功夫")).toEqual({ id: "g1", slug: "功夫" });
    expect(prismaMock.game.findUnique).toHaveBeenCalledTimes(1);
  });

  // 舊網址還在外面流傳，不能直接 404。
  it("falls back to the cuid", async () => {
    prismaMock.game.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "g1", slug: "功夫" });

    expect(await resolveSlugParam("game", "g1")).toEqual({ id: "g1", slug: "功夫" });
  });

  it("returns null when neither matches", async () => {
    prismaMock.tag.findUnique.mockResolvedValue(null);

    expect(await resolveSlugParam("tag", "nope")).toBeNull();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

- [ ] **Step 3: 實作 `src/lib/slug-lookup.ts`**

```ts
import { prisma } from "./prisma";

/**
 * Public URLs carry the slug, but the cuid ones are already out there -- the
 * caller redirects when the param it was given is not the current slug.
 * Slug wins over id so a renamed slug simply stops matching and falls back.
 */
export async function resolveSlugParam(
  model: "game" | "tag",
  param: string
): Promise<{ id: string; slug: string } | null> {
  const select = { id: true, slug: true };

  const bySlug = await prisma[model].findUnique({ where: { slug: param }, select });
  if (bySlug) return bySlug;

  return prisma[model].findUnique({ where: { id: param }, select });
}
```

- [ ] **Step 4: 接進兩個頁面**

`generateMetadata` 與頁面本體都先解析：

```tsx
export default async function GameDetailPage({ params }: PageProps) {
  const { id: param } = await params;
  const found = await resolveSlugParam("game", param);
  if (!found) notFound();
  if (found.slug !== param) permanentRedirect(`/games/${found.slug}`);

  const game = await prisma.game.findUnique({ where: { id: found.id }, include: { ... } });
  ...
```

`permanentRedirect` 從 `next/navigation` import。`generateMetadata` 只要 `resolveSlugParam` 之後用 `found.id` 查 name 即可，轉址交給頁面本體（metadata 階段轉址會讓錯誤訊息難讀）。

原本 `findUnique({ where: { id } })` 的 `id` 換成 `found.id`，`include` 完全不動。

- [ ] **Step 5: 驗證** — `npx jest src/__tests__/lib/slug-lookup.test.ts && npx tsc --noEmit`

- [ ] **Step 6: Commit** — `feat: serve game and tag pages by slug, redirecting old ids`

---

### Task 4: 公開頁的連結改傳 slug

**Files:**
- Modify: `src/app/(public)/games/page.tsx`
- Modify: `src/app/(public)/tags/page.tsx`
- Modify: `src/app/(public)/search/page.tsx`
- Modify: `src/app/(public)/magazines/[id]/issues/[issueId]/page.tsx`

- [ ] **Step 1: 逐檔改**

七處 `/games/${...id}`、`/tags/${...id}` 改成 `${...slug}`。每一處都要回頭確認該筆資料的 query 有 `select` 出 `slug`——多數目前只取 `id` 與 `name`，漏掉會是 `undefined` 而不是編譯錯誤。

用 `rg -n 'games/\$\{|tags/\$\{' src/app/\(public\)` 找齊，改完再跑一次確認歸零（除了 `[id]/page.tsx` 內部的轉址）。

- [ ] **Step 2: 驗證** — `npx tsc --noEmit && npx next build`

- [ ] **Step 3: Commit** — `feat: link to games and tags by slug`

---

### Task 5: 回填既有資料

**Files:**
- Create: `scripts/backfill-slugs.ts`

- [ ] **Step 1: 寫腳本**

```ts
/**
 * 把 games/tags 既有的 `名稱-1786879739750` 換成可讀 slug。
 *
 * 冪等：以 createdAt, id 穩定排序重算，所以重跑不會把 -2 掛到不同一筆上。
 * 需要跑兩次 -- 本機 dev 一次、production 一次。
 */
import { PrismaClient } from "@prisma/client";
import { slugify } from "../src/lib/slugify";

const prisma = new PrismaClient();

async function backfill(model: "game" | "tag") {
  const rows = await prisma[model].findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, name: true, slug: true },
  });

  const taken = new Set<string>();
  let changed = 0;

  for (const row of rows) {
    const base = slugify(row.name) || model;
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    taken.add(slug);

    if (slug !== row.slug) {
      await prisma[model].update({ where: { id: row.id }, data: { slug } });
      changed++;
      console.log(`${row.name}: ${row.slug} -> ${slug}`);
    }
  }

  console.log(`${model}: ${changed}/${rows.length} updated`);
}

async function main() {
  await backfill("game");
  await backfill("tag");
}

main().finally(() => prisma.$disconnect());
```

唯一性用記憶體裡的 `Set` 而不是查資料庫：整批一起重算時資料庫裡還是舊 slug，查了也沒用。

- [ ] **Step 2: 對本機 dev 跑一次**

`npx tsx scripts/backfill-slugs.ts`（沒有 tsx 就 `npx ts-node`）。檢查輸出：`宇宙傳奇Ⅱ` 應變成 `宇宙傳奇ii`，`P.47` 應拿到 `p-47-2`。

- [ ] **Step 3: 再跑一次確認冪等** — 第二次應該回報 `0/397 updated`

- [ ] **Step 4: Commit** — `feat: add a script to backfill readable slugs`

---

### Task 6: 文件與 backlog

**Files:**
- Modify: `docs/routes.md`
- Modify: `BACKLOG.md`

- [ ] **Step 1: routes.md** — `/games/[id]`、`/tags/[id]` 的說明改成「以 slug 為網址，舊 cuid 永久轉址」

- [ ] **Step 2: BACKLOG.md** —「網址裡的 ID 太長」那條改寫：第一階段（遊戲、標籤）已完成、動機修正為可讀而非長度、剩下的是雜誌／單期／文章

- [ ] **Step 3: Commit** — `docs: record the slug-based URLs`

---

## Self-Review

| Spec 段落 | Task |
|---|---|
| Feature 1 slug 規則與唯一性 | 1 |
| Feature 1 接上 resolve-relations | 2 |
| Feature 2 路由解析與轉址 | 3 |
| Feature 2 連結端 | 4 |
| Feature 3 回填 | 5 |
| Testing 表 | 1、2、3、5 |
| 動機改寫、文件 | 6 |

**已知風險**：Task 4 改連結時漏掉 `select: { slug: true }` 不會有編譯錯誤，只會產出 `/games/undefined`。Task 4 的 Step 2 用 `next build` 過一遍，但真正保險的是改完逐頁點過——列在最後的手動驗證。
