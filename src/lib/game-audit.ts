import { nameKey } from "./name-match";

/**
 * 遊戲條目的資料體檢：把「哪裡髒了、髒了幾筆」算成可重跑的報表。
 *
 * 整理 6,744 筆遊戲不可能一次做完，所以每一批清理之後都要能再量一次，看數字
 * 有沒有往下走。判斷全在這裡、取資料與列印在 scripts/audit-games.ts，是為了
 * 讓這些規則進得了 jest。
 *
 * **只報不判**：撞名的群組印出來給人看，不自動合併。同一個中文譯名底下可能是
 * 三款不同遊戲（站上的「洪荒帝國」就掛著 The Legacy、Dune、Savage Empire 三個
 * 括號），分不分得開要看那幾篇文章實際在講什麼。見 docs/data-conventions.md
 * 的「重複條目怎麼歸類」。
 */

export interface AuditGame {
  id: string;
  name: string;
  slug: string;
  nameEn: string | null;
  nameOriginal: string | null;
  aliases: string[];
  nameKeys: string[];
  platforms: string[];
  genres: string[];
  releaseDate: Date | null;
  developer: string | null;
  publisher: string | null;
  coverImage: string | null;
  description: string | null;
  articleCount: number;
}

/** 明細的一列。`group` 把同一組撞名的幾列串起來，其餘檢查留空。 */
export interface AuditRow {
  group: string;
  id: string;
  name: string;
  slug: string;
  articles: number;
  note: string;
}

export interface AuditCheck {
  key: string;
  title: string;
  /** 摘要的每一行，印在標題底下。 */
  summary: string[];
  rows: AuditRow[];
}

const TRAILING_PAREN = /^(.*?)\s*[（(【《「]([^）)】》」]*)[）)】》」]\s*$/;

/**
 * 把結尾那個夾著英文原名的括號拆出來。
 *
 * 目錄抄寫常把原名一起寫進標題（`銀河飛將 II (Wing Commander II)`），那串字該
 * 在 `nameEn`／`aliases`，不在 `name` 裡——留著它，同一款遊戲會因為每一期抄到的
 * 副標不同而裂成好幾筆。
 *
 * **只認含拉丁字母的括號**：`小辣椒的時空冒險(上)`、`創世紀8 異教徒(二)` 的括號
 * 是分篇標記，不是原名，剝掉它們會把兩篇不同的東西併成一筆。
 */
export function splitTrailingLatinParen(
  name: string
): { base: string; paren: string } | null {
  const match = name.match(TRAILING_PAREN);
  if (!match) return null;

  const [, base, paren] = match;
  if (!base || !/[A-Za-z]/.test(paren)) return null;

  return { base, paren };
}

/** 剝掉英文原名之後的識別鍵，用來看兩筆是不是同一款的兩種抄法。 */
export function looseKey(name: string): string {
  return nameKey(splitTrailingLatinParen(name)?.base ?? name);
}

function percent(n: number, total: number): string {
  return total === 0 ? "0%" : `${((n / total) * 100).toFixed(1)}%`;
}

function fieldsCheck(games: AuditGame[]): AuditCheck {
  const filled: [string, (g: AuditGame) => boolean][] = [
    ["nameEn", (g) => !!g.nameEn],
    ["nameOriginal", (g) => !!g.nameOriginal],
    ["aliases", (g) => g.aliases.length > 0],
    ["platforms", (g) => g.platforms.length > 0],
    ["genres", (g) => g.genres.length > 0],
    ["releaseDate", (g) => g.releaseDate !== null],
    ["developer", (g) => !!g.developer],
    ["publisher", (g) => !!g.publisher],
    ["coverImage", (g) => !!g.coverImage],
    ["description", (g) => !!g.description],
  ];

  return {
    key: "fields",
    title: "欄位填寫率",
    summary: filled.map(([label, has]) => {
      const n = games.filter(has).length;
      return `${label.padEnd(13)} ${String(n).padStart(5)} / ${games.length}（${percent(n, games.length)}）`;
    }),
    rows: [],
  };
}

function refsCheck(games: AuditGame[]): AuditCheck {
  const buckets: [string, (n: number) => boolean][] = [
    ["0 篇", (n) => n === 0],
    ["1 篇", (n) => n === 1],
    ["2–4 篇", (n) => n >= 2 && n <= 4],
    ["5 篇以上", (n) => n >= 5],
  ];

  return {
    key: "refs",
    title: "被幾篇文章引用",
    summary: buckets.map(([label, inBucket]) => {
      const n = games.filter((g) => inBucket(g.articleCount)).length;
      return `${label.padEnd(10)} ${String(n).padStart(5)}（${percent(n, games.length)}）`;
    }),
    rows: [],
  };
}

function toRow(game: AuditGame, note: string, group = ""): AuditRow {
  return {
    group,
    id: game.id,
    name: game.name,
    slug: game.slug,
    articles: game.articleCount,
    note,
  };
}

/** 一筆一列的檢查：符合條件就收下，note 說明是哪裡不對。 */
function flagCheck(
  key: string,
  title: string,
  games: AuditGame[],
  note: (g: AuditGame) => string | null
): AuditCheck {
  const rows = games.flatMap((game) => {
    const text = note(game);
    return text === null ? [] : [toRow(game, text)];
  });

  return { key, title, summary: [`${rows.length} 筆`], rows };
}

/** 撞在同一個鍵上的分成一組；只有一筆的不算。 */
function groupCheck(
  key: string,
  title: string,
  games: AuditGame[],
  keysOf: (g: AuditGame) => string[]
): AuditCheck {
  const byKey = new Map<string, AuditGame[]>();
  for (const game of games) {
    for (const k of new Set(keysOf(game).filter(Boolean))) {
      byKey.set(k, [...(byKey.get(k) ?? []), game]);
    }
  }

  const groups = [...byKey.entries()]
    .filter(([, members]) => members.length > 1)
    .sort(([, a], [, b]) => b.length - a.length);

  const rows = groups.flatMap(([groupKey, members]) =>
    members.map((game) =>
      toRow(game, splitTrailingLatinParen(game.name)?.paren ?? "", groupKey)
    )
  );

  return {
    key,
    title,
    summary: [`${groups.length} 組、${rows.length} 筆`],
    rows,
  };
}

export function auditGames(games: AuditGame[]): AuditCheck[] {
  return [
    fieldsCheck(games),
    refsCheck(games),
    flagCheck(
      "paren-en",
      "名稱裡夾著英文原名（該搬進 nameEn／aliases）",
      games,
      (g) => splitTrailingLatinParen(g.name)?.paren ?? null
    ),
    groupCheck(
      "loose-dup",
      "剝掉英文原名之後撞名（同一款的不同抄法，或同名異作）",
      games,
      (g) => [looseKey(g.name)]
    ),
    groupCheck("key-dup", "nameKeys 已經撞在一起", games, (g) => g.nameKeys),
    flagCheck("kana", "名稱含假名（多半是日文原名被建成獨立條目）", games, (g) =>
      /[ぁ-ゖァ-ヺ]/.test(g.name) ? "含假名" : null
    ),
    flagCheck("long", "名稱超過 25 字（多半是標語被當成遊戲名）", games, (g) =>
      g.name.length > 25 ? `${g.name.length} 字` : null
    ),
    flagCheck("orphan", "沒有任何文章引用", games, (g) =>
      g.articleCount === 0 ? "0 篇" : null
    ),
  ];
}
