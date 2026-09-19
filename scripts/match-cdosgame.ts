/**
 * 把 cdosgame 的條目對到站上的 `Game`，順便查出平台，輸出一份給人審的對照表。
 *
 * 三個站的資料要互相關聯，最直接的接點是遊戲（見 BACKLOG 的「與 nostalib /
 * cdosgame 兩站的資料連動」）。但**對照關係要人確認過才算數**：`nameKey()` 只看
 * 名字，同名異作它分不出來，而假名被正規化吃掉的那個已知 bug 會讓純片假名的名稱
 * 互撞（「皇室血裔2」對到「ガングリフォンII」就是這樣來的）。所以這支只出表，
 * 不寫資料庫。
 *
 * `cdg_platform` 原樣帶出 cdosgame 的 `platform_note`（DOS／Windows／Apple II），
 * **不寫進 `Game.platforms`**：那要先有一套正規化的平台代號，否則只是把
 * PLATFORM 標籤那邊的混亂（`FC/紅白機` 與 `紅白機` 並存）複製到欄位上。
 *
 * 用法：
 *   npx tsx scripts/match-cdosgame.ts --prod [--developer=KOEI] [-o <out.csv>]
 *
 * `--developer` 不給就跑 cdosgame 全部 2,655 筆。上游 JSON 預設從線上抓，
 * `--json=<檔>` 可指定本地快照。
 *
 * `--bucket=A,B` 再往下切一刀，只留指定的堆。分堆決定的是要花多少眼力——A 與 B
 * （正規化後完全相同、一中一西）錯得少，可以整批快速掃過；C 與 D 得看文章。
 * 帶 ⚠年代分歧的一律不在 `--bucket` 的結果裡，那些無論哪一堆都要逐組判。
 *
 * `--groups` 只留「同一個上游條目對到站上好幾筆」的組，那是**合併候選清單**：
 * 上游連同它的 `title_aliases` 認定這幾筆是同一款，判準比 `loose-dup.csv` 強得多
 * ——後者只剝括號，抓不到 `Age of Empires` 與 `世紀帝國` 是同一款。仍然只是候選：
 * 上游也可能對錯其中一筆，合併前要看文章（見「重複條目怎麼歸類」）。
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "fs";
import { nameKey } from "../src/lib/name-match";
import { escapeCsvField } from "../src/lib/csv/escape";
import {
  classifyGroup,
  joinIsOnlyResidue,
  yearsDiverge,
  BUCKET_LABELS,
} from "../src/lib/merge-candidates";

const CDOSGAME_JSON = "https://cdosgame.simagame.me/games.json";

const args = process.argv.slice(2);
const arg = (name: string) =>
  args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const developer = arg("developer");
const buckets = arg("bucket")?.split(",").map((b) => b.trim().toUpperCase());
const outPath = arg("o") ?? args[args.indexOf("-o") + 1];

interface CdosGame {
  id: string;
  title_zh: string;
  title_aliases?: string[];
  year?: number;
  developer?: string;
  platform_note?: string;
  img?: number;
}

async function loadCdosGames(): Promise<CdosGame[]> {
  const local = arg("json");
  const all: CdosGame[] = local
    ? JSON.parse(readFileSync(local, "utf8"))
    : await (await fetch(CDOSGAME_JSON)).json();

  return developer ? all.filter((g) => g.developer === developer) : all;
}


/**
 * 合併候選的分組表：丟掉假陽性、分堆、附上文章年份當交叉證據。
 *
 * `decision` 是留給人填的欄位（`合併`／`不合併`／留空表示還沒判），這支腳本不讀它
 * ——合併是刪除、不可逆，只能由人一組一組按下去。
 */
function buildGroups(
  rows: Record<string, string>[],
  cdos: CdosGame[],
  games: { id: string; name: string; aliases: string[]; articleGames: { article: { issue: { publishSort: Date | null } } }[] }[]
): Record<string, string>[] {
  const entryById = new Map(cdos.map((c) => [c.id, c]));
  const gameById = new Map(games.map((g) => [g.id, g]));

  const perEntry = new Map<string, number>();
  for (const row of rows) {
    if (row.tocr_id) perEntry.set(row.cdg_id, (perEntry.get(row.cdg_id) ?? 0) + 1);
  }

  /** 該筆遊戲的文章出版年份區間，沒有文章就回 null。 */
  const span = (id: string) => {
    const years = (gameById.get(id)?.articleGames ?? [])
      .map((l) => l.article.issue.publishSort?.getUTCFullYear())
      .filter((y): y is number => !!y)
      .sort();
    return years.length ? ([years[0], years[years.length - 1]] as const) : null;
  };

  const candidates = rows
    .filter((r) => r.tocr_id && (perEntry.get(r.cdg_id) ?? 0) > 1)
    .sort((a, b) => a.cdg_id.localeCompare(b.cdg_id));

  const byEntry = new Map<string, Record<string, string>[]>();
  for (const row of candidates) {
    byEntry.set(row.cdg_id, [...(byEntry.get(row.cdg_id) ?? []), row]);
  }

  const out: Record<string, string>[] = [];
  for (const [cdgId, group] of byEntry) {
    const entry = entryById.get(cdgId);
    if (!entry) continue;
    const titles = [entry.title_zh, ...(entry.title_aliases ?? [])];

    // 只靠殘骸湊在一起的先丟掉——留著只會讓每一輪人工複判都要重新排除一次。
    const kept = group.filter((row) => {
      const game = gameById.get(row.tocr_id);
      return game ? !joinIsOnlyResidue(titles, [game.name, ...game.aliases]) : false;
    });
    if (kept.length < 2) continue;

    const bucket = classifyGroup(kept.map((r) => r.tocr_name), entry.title_zh);
    const spans = kept.map((r) => span(r.tocr_id)).filter(Boolean) as (readonly [number, number])[];
    const diverge = spans.length === kept.length && yearsDiverge(spans);
    const label = BUCKET_LABELS[bucket] + (diverge ? " ⚠年代分歧" : "");

    for (const row of kept) {
      const s = span(row.tocr_id);
      out.push({ ...row, bucket: label, years: s ? `${s[0]}–${s[1]}` : "", decision: "" });
    }
  }

  return out.sort((a, b) => a.bucket.localeCompare(b.bucket) || a.cdg_id.localeCompare(b.cdg_id));
}

async function main() {
  if (args.includes("--prod")) {
    process.env.DATABASE_URL = execFileSync("security", [
      "find-generic-password", "-s", "tocr-prod-db-url", "-a", process.env.USER ?? "", "-w",
    ]).toString().trim();
  }
  const { prisma } = await import("../src/lib/prisma");

  try {
    const [cdos, games] = await Promise.all([
      loadCdosGames(),
      prisma.game.findMany({
        select: {
          id: true,
          name: true,
          nameKeys: true,
          aliases: true,
          platforms: true,
          _count: { select: { articleGames: true } },
          articleGames: {
            select: { article: { select: { issue: { select: { publishSort: true } } } } },
          },
        },
      }),
    ]);

    type Game = (typeof games)[number];
    const byKey = new Map<string, Game[]>();
    for (const game of games) {
      for (const key of game.nameKeys) {
        byKey.set(key, [...(byKey.get(key) ?? []), game]);
      }
    }

    /** 一律 string：這份表是給人看的，欄位型別在 CSV 裡沒有意義。 */
    type Row = Record<string, string>;

    const rows: Row[] = cdos.flatMap((c): Row[] => {
      const keys = [c.title_zh, ...(c.title_aliases ?? [])]
        .map(nameKey)
        .filter(Boolean);
      const found = [...new Set(keys.flatMap((k) => byKey.get(k) ?? []))];

      // 對到兩筆以上就每筆一列：那是要人判「同一款的兩種抄法」還是「同名異作」，
      // 擠成一格看不出各自掛了幾篇。
      const status = found.length === 0 ? "站上沒有" : found.length > 1 ? "要判" : "";
      const base = {
        cdg_id: c.id,
        cdg_title: c.title_zh,
        year: String(c.year ?? ""),
        cdg_platform: c.platform_note ?? "",
        cdg_images: String(c.img ?? 0),
      };

      if (found.length === 0) {
        return [{ ...base, tocr_id: "", tocr_name: "", articles: "", tocr_platforms: "", status }];
      }
      return found.map((g) => ({
        ...base,
        tocr_id: g.id,
        tocr_name: g.name,
        articles: String(g._count.articleGames),
        tocr_platforms: g.platforms.join("、"),
        // 假名會被 nameKey 整段丟掉，純片假名的名稱正規化後只剩數字，所以
        // 「カスタムメイト・2」會撞上任何帶 2 的名字。這類誤中是系統性的，
        // 標出來免得在合併清單上被當成同一款。
        status: [status, /[\u3041-\u3096\u30a1-\u30fa]/.test(g.name) ? "名稱含假名" : ""]
          .filter(Boolean)
          .join("、"),
      }));
    });

    // --groups：只留撞成一組的，並讓同組相鄰——這份是拿來一組一組判的。
    const grouped = args.includes("--groups");
    let output = grouped ? buildGroups(rows, cdos, games) : rows;
    if (grouped && buckets) {
      output = output.filter(
        (r) => buckets.includes(r.bucket[0]) && !r.bucket.includes("⚠")
      );
    }

    const header = grouped
      ? [
          "bucket", "cdg_id", "cdg_title", "year", "cdg_platform", "cdg_images",
          "tocr_id", "tocr_name", "articles", "years", "tocr_platforms", "status", "decision",
        ]
      : [
          "cdg_id", "cdg_title", "year", "cdg_platform", "cdg_images",
          "tocr_id", "tocr_name", "articles", "tocr_platforms", "status",
        ];
    const csv = [
      header.join(","),
      ...output.map((r) =>
        header.map((h) => escapeCsvField(r[h] ?? "")).join(",")
      ),
    ].join("\n") + "\n";

    if (outPath) writeFileSync(outPath, csv);
    else process.stdout.write(csv);

    const matched = new Set(output.filter((r) => r.tocr_id).map((r) => r.cdg_id));
    if (args.includes("--groups")) {
      const perBucket = new Map<string, Set<string>>();
      for (const row of output) {
        const set = perBucket.get(row.bucket) ?? new Set<string>();
        set.add(row.cdg_id);
        perBucket.set(row.bucket, set);
      }
      console.error(`\n合併候選 ${matched.size} 組、${output.length} 筆條目`);
      for (const label of [...perBucket.keys()].sort()) {
        console.error(`   ${label}：${perBucket.get(label)!.size} 組`);
      }
      if (outPath) console.error(`→ ${outPath}`);
    } else {
      const ambiguous = new Set(rows.filter((r) => r.status === "要判").map((r) => r.cdg_id));
      const withPlatform = rows.filter((r) => r.cdg_platform).length;
      console.error(
        `\ncdosgame ${cdos.length} 款：對上 ${matched.size}（其中 ${ambiguous.size} 款要判）、` +
          `站上沒有 ${cdos.length - matched.size}；${withPlatform} 列查得到平台` +
          (outPath ? `\n→ ${outPath}` : "")
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
