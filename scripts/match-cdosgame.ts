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
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "fs";
import { nameKey } from "../src/lib/name-match";
import { escapeCsvField } from "../src/lib/csv/escape";

const CDOSGAME_JSON = "https://cdosgame.simagame.me/games.json";

const args = process.argv.slice(2);
const arg = (name: string) =>
  args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const developer = arg("developer");
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
          platforms: true,
          _count: { select: { articleGames: true } },
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
        status,
      }));
    });

    const header = [
      "cdg_id", "cdg_title", "year", "cdg_platform", "cdg_images",
      "tocr_id", "tocr_name", "articles", "tocr_platforms", "status",
    ];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        header.map((h) => escapeCsvField(r[h] ?? "")).join(",")
      ),
    ].join("\n") + "\n";

    if (outPath) writeFileSync(outPath, csv);
    else process.stdout.write(csv);

    const matched = new Set(rows.filter((r) => r.tocr_id).map((r) => r.cdg_id));
    const ambiguous = new Set(rows.filter((r) => r.status === "要判").map((r) => r.cdg_id));
    const withPlatform = rows.filter((r) => r.cdg_platform).length;
    console.error(
      `\ncdosgame ${cdos.length} 款：對上 ${matched.size}（其中 ${ambiguous.size} 款要判）、` +
        `站上沒有 ${cdos.length - matched.size}；${withPlatform} 列查得到平台` +
        (outPath ? `\n→ ${outPath}` : "")
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
