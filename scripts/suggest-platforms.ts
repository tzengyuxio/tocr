/**
 * 把兩份現成的來源湊成 `Game.platforms` 的寫入提案，**只出表不寫庫**。
 *
 * 平台欄位 6,744 筆全空，而兩份權威來源涵蓋的年代剛好互補：
 *
 * - **cdosgame 的 `platform_note`**（線上 JSON）：DOS／Windows／Apple II，PC 老遊戲
 * - **`data/famitsu-game-index.csv` 的 `platform_tag`**：《電玩通》封底的遊戲索引，
 *   編輯部自己依平台分列過，2000 年代主機
 *
 * 兩邊都靠 `nameKey()` 對到站上的條目，所以**都可能對錯**——同名異作分不出來，
 * 而純片假名的名稱會因為 nameKey 吃掉假名互相誤判。代號本身認不得的寫法列在
 * `unknown` 欄，不猜：猜錯會把一款遊戲標到它沒出過的主機上。
 *
 * 用法：
 *   npx tsx scripts/suggest-platforms.ts --prod [-o <out.csv>]
 *
 * 審過之後的寫入要走 API 不走 SQL（見 data-conventions 的「改資料走 API」）。
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "fs";
import { nameKey } from "../src/lib/name-match";
import { toPlatformCodes, type PlatformCode } from "../src/lib/game-platforms";
import { escapeCsvField } from "../src/lib/csv/escape";

const CDOSGAME_JSON = "https://cdosgame.simagame.me/games.json";
const FAMITSU_INDEX = "data/famitsu-game-index.csv";

const args = process.argv.slice(2);
const outPath = args.find((a) => a.startsWith("-o="))?.slice(3) ?? args[args.indexOf("-o") + 1];

/** 一個來源查出來的東西：代號、認不得的原字、以及是哪一筆給的。 */
interface Hit {
  codes: Set<PlatformCode>;
  unknown: Set<string>;
  /** 給人讀的出處：cdosgame 的條目編號、《電玩通》的期號。 */
  refs: Set<string>;
  /**
   * 上游條目的身分，用來看「同一個條目是不是對到站上好幾筆」。
   *
   * 跟 `refs` 分開是因為兩份來源的出處粒度不同：cdosgame 的 `cdg-0212` 就是一款
   * 遊戲，而《電玩通》的 `VOL.338` 是一整期的索引——拿期號當身分，同一期裡的
   * 五十款遊戲會全部算成「共用來源」，那是同期不是同款。
   */
  ids: Set<string>;
  /** 靠別名對上的來源。別名比主名容易誤中，值得在報表上分出來。 */
  viaAlias: Set<string>;
}

function hit(): Hit {
  return {
    codes: new Set(), unknown: new Set(), refs: new Set(),
    ids: new Set(), viaAlias: new Set(),
  };
}

function absorb(
  into: Map<string, Hit>,
  key: string,
  raw: string,
  ref: string,
  id: string,
  viaAlias = false
) {
  const { codes, unknown } = toPlatformCodes(raw);
  const target = into.get(key) ?? hit();

  codes.forEach((c) => target.codes.add(c));
  unknown.forEach((u) => target.unknown.add(u));
  target.refs.add(ref);
  target.ids.add(id);
  if (viaAlias) target.viaAlias.add(ref);
  into.set(key, target);
}

async function loadCdosgame(): Promise<Map<string, Hit>> {
  const games: {
    id: string;
    title_zh: string;
    title_aliases?: string[];
    platform_note?: string;
  }[] = await (await fetch(CDOSGAME_JSON)).json();

  const byKey = new Map<string, Hit>();
  for (const game of games) {
    if (!game.platform_note) continue;
    const titles = [game.title_zh, ...(game.title_aliases ?? [])];
    for (const [index, title] of titles.entries()) {
      const key = nameKey(title);
      if (key) absorb(byKey, key, game.platform_note, game.id, game.id, index > 0);
    }
  }
  return byKey;
}

function loadFamitsu(): Map<string, Hit> {
  const byKey = new Map<string, Hit>();

  for (const line of readFileSync(FAMITSU_INDEX, "utf8").split("\n").slice(1)) {
    const [issue, , platformTag, name] = line.split(",");
    if (!name || !platformTag) continue;

    const key = nameKey(name);
    // 身分是遊戲名，不是期號：同一期的索引裡有幾十款遊戲。
    if (key) absorb(byKey, key, platformTag, `VOL.${issue}`, `索引:${key}`);
  }
  return byKey;
}

/**
 * 這一列為什麼不能不看。空的就是可以照著寫。
 *
 * 判準都是「對照本身可能錯」，不是「平台值本身可疑」——值是從權威來源原樣映射
 * 過來的，會出錯的是中間那一步比對。
 */
function risksOf(
  game: { name: string },
  fromCdos: Hit,
  fromFamitsu: Hit
): string[] {
  const risks: string[] = [];

  if (fromCdos.viaAlias.size > 0 || fromFamitsu.viaAlias.size > 0) {
    risks.push("靠別名對上");
  }
  // nameKey 會把假名整段丟掉，純片假名的名稱正規化後只剩數字，互相誤判。
  if (/[\u3041-\u3096\u30a1-\u30fa]/.test(game.name)) {
    risks.push("名稱含假名");
  }
  if (fromCdos.ids.size > 1 || fromFamitsu.ids.size > 1) {
    risks.push("對到多個來源條目");
  }
  if (fromCdos.codes.size > 0 && fromFamitsu.codes.size > 0) {
    risks.push("兩邊都給");
  }

  return risks;
}

async function main() {
  if (args.includes("--prod")) {
    process.env.DATABASE_URL = execFileSync("security", [
      "find-generic-password", "-s", "tocr-prod-db-url", "-a", process.env.USER ?? "", "-w",
    ]).toString().trim();
  }
  const { prisma } = await import("../src/lib/prisma");

  try {
    const [cdos, famitsu, games] = await Promise.all([
      loadCdosgame(),
      Promise.resolve(loadFamitsu()),
      prisma.game.findMany({
        select: {
          id: true,
          name: true,
          nameKeys: true,
          platforms: true,
          _count: { select: { articleGames: true } },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    const look = (source: Map<string, Hit>, keys: string[]) => {
      const found = hit();
      for (const key of keys) {
        const one = source.get(key);
        if (!one) continue;
        one.codes.forEach((c) => found.codes.add(c));
        one.unknown.forEach((u) => found.unknown.add(u));
        one.refs.forEach((r) => found.refs.add(r));
        one.ids.forEach((i) => found.ids.add(i));
        one.viaAlias.forEach((r) => found.viaAlias.add(r));
      }
      return found;
    };

    const rows = games.flatMap((game) => {
      const fromCdos = look(cdos, game.nameKeys);
      const fromFamitsu = look(famitsu, game.nameKeys);
      const suggested = [...new Set([...fromCdos.codes, ...fromFamitsu.codes])];
      if (suggested.length === 0 && fromCdos.unknown.size === 0 && fromFamitsu.unknown.size === 0) {
        return [];
      }

      return [{
        tocr_id: game.id,
        tocr_name: game.name,
        articles: String(game._count.articleGames),
        current: game.platforms.join("、"),
        suggested: suggested.join("、"),
        from_cdosgame: [...fromCdos.codes].join("、"),
        from_famitsu: [...fromFamitsu.codes].join("、"),
        sources: [...fromCdos.refs, ...fromFamitsu.refs].join(" "),
        source_ids: [...fromCdos.ids, ...fromFamitsu.ids].join(" "),
        unknown: [...fromCdos.unknown, ...fromFamitsu.unknown].join("、"),
        risk: risksOf(game, fromCdos, fromFamitsu).join("、"),
        shared_with: "",
      }];
    });

    // 一個上游條目對到站上好幾筆，多半是站上那款散成好幾種抄法（三國志有 33 筆），
    // 但也可能是上游對錯了其中幾筆。標出來，別讓它混在乾淨的列裡。
    //
    // `shared_with` 附上共用來源的其他條目名稱，因為那就是判斷的依據：看到
    // 「三國志IV／三國志 IV／三國志4中文版」一眼就知道是同一款的三種抄法，
    // 看到兩個不相干的名字才需要去翻文章。
    const perSource = new Map<string, string[]>();
    for (const row of rows) {
      for (const id of row.source_ids.split(" ").filter(Boolean)) {
        perSource.set(id, [...(perSource.get(id) ?? []), row.tocr_name]);
      }
    }
    for (const row of rows) {
      const shared = row.source_ids
        .split(" ")
        .filter((id) => (perSource.get(id) ?? []).length > 1);
      if (shared.length === 0) continue;

      row.risk = [row.risk, `來源同時給了別筆(${shared.length})`].filter(Boolean).join("、");
      row.shared_with = [
        ...new Set(
          shared.flatMap((id) => perSource.get(id) ?? []).filter((n) => n !== row.tocr_name)
        ),
      ].join(" / ");
    }

    const header = [
      "tocr_id", "tocr_name", "articles", "current", "suggested",
      "from_cdosgame", "from_famitsu", "sources", "source_ids", "unknown", "risk", "shared_with",
    ];
    const csv = [
      header.join(","),
      ...rows.map((r) => header.map((h) => escapeCsvField(r[h as keyof typeof r])).join(",")),
    ].join("\n") + "\n";

    if (outPath) writeFileSync(outPath, csv);
    else process.stdout.write(csv);

    // 兩邊給的不一樣多半不是衝突，是跨平台——《電玩通》只收主機版，cdosgame 只收
    // PC 版，同一款遊戲兩邊各給一半。但也可能有一邊根本對錯了條目，所以要人看。
    const both = rows.filter((r) => r.from_cdosgame && r.from_famitsu);
    const differ = both.filter((r) => r.from_cdosgame !== r.from_famitsu);
    const unknowns = new Set(rows.flatMap((r) => (r.unknown ? r.unknown.split("、") : [])));

    const clean = rows.filter((r) => r.suggested && !r.risk);
    console.error(
      `\n站上 ${games.length} 筆，查得到平台的 ${rows.filter((r) => r.suggested).length} 筆` +
        `（其中 ${clean.length} 筆沒有風險標記，${rows.filter((r) => r.risk).length} 筆要人看）：` +
        `cdosgame ${rows.filter((r) => r.from_cdosgame).length}、` +
        `《電玩通》索引 ${rows.filter((r) => r.from_famitsu).length}、` +
        `兩邊都給得出 ${both.length}（其中 ${differ.length} 筆給的不一樣：` +
        `多半是跨平台、合起來才完整，但也可能有一邊對錯條目，要人看）` +
        (unknowns.size ? `\n認不得的寫法：${[...unknowns].join("、")}` : "") +
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
