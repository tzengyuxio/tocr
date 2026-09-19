/**
 * 把「同一個 cdosgame 條目對到站上好幾筆」的組分堆，好讓人一次判一類。
 *
 * 出表的腳本是 scripts/match-cdosgame.ts --groups。分堆本身是純函式，因為合併是
 * 刪除、不可逆，判準得看得見也測得到。
 */
import { nameKey } from "./name-match";

/** `nameKey` 留下的字元：見 name-match.ts。其他書寫系統整段被丟掉。 */
const KEPT = /[^a-z0-9\u4e00-\u9fff]/g;
const LETTERS = /[^\p{L}\p{N}]/gu;

/**
 * 這個名字有沒有被 `nameKey` 掏空——一半以上的字被丟掉就算。
 *
 * 剩下的那點殘骸仍然是一把合法的鍵，會去撞真的叫那個名字的條目：這份清單上曾經有
 * 十二組是這樣來的，「カスタムメイト・2」只剩 `2`、「임진록2」也是，上游的
 * 「三國志リターンズ」剩「三國志」，把站上有 13 篇的《三國志》拉了進來。
 *
 * **假名與諺文 2026-09-20 已經在 `slugify` 那端修掉了**，所以那幾組不會再出現。
 * 這道閘留著是因為 `nameKey` 的字元集不含其他書寫系統（西里爾、泰文、阿拉伯文），
 * 上游哪天收了一筆俄文原名，同樣會殘成一把撞得到人的鍵。
 */
function isGutted(source: string): boolean {
  const normalized = source.normalize("NFKC").toLowerCase();
  const kept = normalized.replace(KEPT, "");
  const letters = normalized.replace(LETTERS, "");
  return kept.length * 2 <= letters.length;
}

/**
 * 這一組是不是只靠被掏空的名字才湊在一起。這種組不是合併候選，是雜訊。
 */
export function joinIsOnlyResidue(
  entryTitles: string[],
  gameNames: string[]
): boolean {
  const keysOf = (titles: string[]) => {
    const map = new Map<string, string[]>();
    for (const title of titles) {
      const key = nameKey(title);
      if (key) map.set(key, [...(map.get(key) ?? []), title]);
    }
    return map;
  };

  const entryKeys = keysOf(entryTitles);
  const gameKeys = keysOf(gameNames);
  const shared = [...entryKeys.keys()].filter((key) => gameKeys.has(key));
  if (shared.length === 0) return false;

  // 一把鍵可疑，是因為產生它的名字**每一個**都被掏空。任一邊可疑就夠了——
  // 殘骸撞上真名字，跟兩個殘骸互撞一樣沒有意義。
  const suspect = (sources: string[]) => sources.every(isGutted);
  return shared.every(
    (key) => suspect(entryKeys.get(key)!) || suspect(gameKeys.get(key)!)
  );
}

export type Bucket = "A" | "B" | "C" | "D";

export const BUCKET_LABELS: Record<Bucket, string> = {
  A: "A 正規化後完全相同",
  B: "B 一中一西",
  C: "C 同語言、字面小異",
  D: "D 同語言、字面差很多",
};

const LATIN_ONLY = (s: string) => /^[\x20-\x7E]+$/.test(s);

/**
 * 這一組的幾個站上名稱之間是什麼關係。
 *
 * 分堆只看名字，**不代表可不可以合併**——它只決定要花多少眼力。A 與 B 錯得少
 * （差一個空格、譯名對原名），C 與 D 一定要看文章。
 */
export function classifyGroup(names: string[], cdgTitle: string): Bucket {
  const keys = names.map(nameKey);
  if (new Set(keys).size === 1) return "A";
  if (names.some(LATIN_ONLY) && names.some((n) => !LATIN_ONLY(n))) return "B";

  const cdgKey = nameKey(cdgTitle);
  const nested = keys.every(
    (k, i) => i === 0 || k.includes(keys[0]) || keys[0].includes(k)
  );
  return keys.some((k) => k === cdgKey) || nested ? "C" : "D";
}

/**
 * 兩筆的文章年份差得夠遠就標出來——那是「同名異作」最便宜的證據。
 *
 * 站上的《聖戰奇兵》有 6 篇、全在 1989–1990，那個年代的「聖戰奇兵」是印第安納
 * 瓊斯第三集的中文片名，不是上游別名指的 1999 年《聖劍奇兵》。
 */
export function yearsDiverge(spans: (readonly [number, number])[], gap = 3): boolean {
  if (spans.length < 2) return false;
  const sorted = [...spans].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i][0] - sorted[i - 1][1] >= gap) return true;
  }
  return false;
}
