/**
 * 讓 Jev 對合併候選做初判，輸出一份帶分流欄位的表給人審。
 *
 * `match-cdosgame.ts --groups` 出的候選表只說「同一個上游條目對到站上好幾筆」，
 * 判準比 `loose-dup.csv` 強，但**它只看得到名字**。名字裡沒有的東西它就判不出來：
 * `夢幻遊樂園` 與 `千禧新樂園` 是《模擬樂園》先後兩家代理商用的名字，字面毫無交集；
 * `聖劍奇兵` 與 `聖戰奇兵` 只差一個字卻是兩款不同的遊戲。要分開這兩種，得有考證。
 *
 * 考證就在 cdosgame 的本地工作目錄裡。`~/works/cdosgame/content/games/<id>.md`
 * 每一筆除了 frontmatter 還有人工撰寫的正文，代理商改名史通常寫得很清楚——
 * cdg-3190 的第二段就直說「最初由第三波以《夢幻遊樂園》之名代理引進…其後改由光譜
 * 接手，先後以《千禧新樂園》及《模擬樂園2002》的名義重新包裝發行」。所以這支用本地
 * 目錄當上游來源，不用線上的 `games.json`（那份只有標題與別名，沒有正文）。
 *
 * 用法：
 *   npx tsx scripts/jev-merge-triage.ts [-i <候選表>] [-o <輸出>] [--cdosgame=<目錄>]
 *
 * 需要 `.env.local` 的 `JEV_API_KEY`（TypeSafe AI 的 `apikey_…`，
 * 見 <https://console.typesafe.ai/keys>）。約 1,350 input token／對，199 對約 $0.11。
 *
 * 有一類錯 jev 看不見，因為它一次只看一對：站上同一筆條目被兩個上游條目認領時，
 * 兩組裡必有一組是錯的。這個數一下就知道，所以 `multi_claim` 欄不問模型，直接標出來
 * 並一律送人工——2026-09-22 抽驗 20 對，唯一的那個錯就是這麼來的。
 *
 * **這支不寫資料庫，也不填 `decision`。** 合併是刪除、不可逆，判決留給人；
 * 這裡只出 `triage` 與三個 jev 欄位，決定人該往哪幾對花眼力。門檻怎麼來的、
 * 有多不牢靠，見 data/game-audit/README.md 的「jev 初判怎麼讀」。
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { homedir } from "node:os";
import { escapeCsvField } from "../src/lib/csv/escape";

const args = process.argv.slice(2);
const arg = (name: string) =>
  args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const IN_PATH = flag("-i") ?? "data/game-audit/merge-candidates.csv";
const OUT_PATH = flag("-o") ?? "data/game-audit/merge-candidates-jev.csv";
const CDOSGAME_DIR = arg("cdosgame") ?? `${homedir()}/works/cdosgame/content/games`;
const API_URL = "https://api.typesafe.ai/v1/systemone";
const CONCURRENCY = 8;

/**
 * `era_mismatch` 到這個值就不看 `same_game` 直接送人工。
 *
 * 只在 16 組已知答案上配過，等於用兩個點定一條線：0.80 剛好同時擋住
 * `羅馬帝國AD92`／`羅馬帝國`（0.81）又放過 `雷電`／`Raiden`（0.73）。
 * 它是叫人來看的旗標，不是否決。
 */
const ERA_MISMATCH_FLAG = 0.8;
/** 到這個值才算「建議合併」。同樣是在那 16 組上配的。 */
const SAME_GAME_MERGE = 0.85;
/** 低於這個值算「建議不合」。 */
const SAME_GAME_REJECT = 0.5;

const NOTE =
  "entry 是台灣老遊戲雜誌目錄資料庫裡的一筆遊戲條目。upstream_match 是外部遊戲資料庫對到的條目，" +
  "它的 description 是人工撰寫的考證，常會直接說明這款遊戲在台灣被哪幾家代理商用過哪些不同譯名。" +
  "aliases 是上游整理的別名清單。article_year_range 是這筆條目被台灣雜誌文章提到的出版年份區間。";

const RELATION = {
  same_writing: "同一款，只差標點、空白或全半形等寫法",
  translation_pair: "同一款，一邊中文譯名一邊原文名，或兩個不同代理商用的不同譯名",
  same_game_variant: "同一款的不同版本或載體",
  series_vs_entry: "一邊是系列總稱或不同代，一邊是系列中的單一作品",
  different_game: "不同的遊戲，只是名字相近或撞名",
  unclear: "資訊不足，判不出來",
};

interface Candidate {
  bucket: string;
  cdg_id: string;
  cdg_title: string;
  year: string;
  cdg_platform: string;
  tocr_id: string;
  tocr_name: string;
  articles: string;
  years: string;
}

/** 逗號分隔、認得雙引號的最小剖析。輸出端用 `escapeCsvField`，所以欄位可能帶引號。 */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  const split = (line: string) => {
    const fields: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) {
        if (c === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (c === '"') quoted = false;
        else cur += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") {
        fields.push(cur);
        cur = "";
      } else cur += c;
    }
    fields.push(cur);
    return fields;
  };
  const header = split(lines[0]);
  return lines.slice(1).map((line) => Object.fromEntries(split(line).map((v, i) => [header[i], v])));
}

interface Upstream {
  title: string | null;
  aliases: string[];
  year: string | null;
  developer: string | null;
  platform: string | null;
  description: string;
}

/**
 * 本地那筆 Markdown 的 frontmatter 欄位，加上正文前三段。
 *
 * 只手工剝 frontmatter 不引 YAML 套件：要的就是幾個純量欄位與一個字串陣列，
 * 為這點東西多一個相依不划算。正文截到三段是因為代理譯名幾乎都在開頭交代完，
 * 後面是玩法與評測，送過去只是多付 token。
 */
function readUpstream(cdgId: string): Upstream | null {
  const path = `${CDOSGAME_DIR}/${cdgId}.md`;
  if (!existsSync(path)) return null;

  const raw = readFileSync(path, "utf8");
  const parts = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  if (!parts) return null;
  const [, frontmatter, rest] = parts;

  const field = (key: string) =>
    new RegExp(`^${key}: (.+)$`, "m").exec(frontmatter)?.[1].trim() ?? null;
  const aliasBlock = /^title_aliases:\n((?:- .+\n)+)/m.exec(frontmatter)?.[1];

  const body = rest
    .replace(/<sup class="cite"[^>]*><\/sup>/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // 內部連結只留文字
  const description = body
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join("\n\n")
    .slice(0, 1800);

  return {
    title: field("title_zh"),
    aliases: aliasBlock?.trimEnd().split("\n").map((l) => l.slice(2).trim()) ?? [],
    year: field("year"),
    developer: field("developer"),
    platform: field("platform_note"),
    description,
  };
}

interface Answers {
  same_game: { noul: number };
  relation: { choice: string; confidence: number };
  era_mismatch: { noul: number };
}

const entry = (c: Candidate) => ({
  name: c.tocr_name,
  article_count: Number(c.articles),
  article_year_range: c.years,
});

async function ask(a: Candidate, b: Candidate, upstream: Upstream, apiKey: string): Promise<Answers> {
  const other = entry(b);
  const payload = {
    model: "jev-latest",
    state: { entry: entry(a), upstream_match: upstream, note: NOTE },
    questions: {
      same_game: {
        type: "noul",
        instructions: {
          other_entry: other,
          question:
            "`other_entry` 和 state 裡的 entry 是同一款遊戲嗎？先看 upstream_match 的 description 有沒有交代這兩個名字的來歷。",
        },
        criteria: {
          true: "同一款遊戲的兩種寫法。只差標點空白全半形、中文譯名對原文名、不同代理商用的不同譯名、或同一款的不同版本與載體，都算同一款",
          false:
            "不是同一款。系列裡的不同代不算同一款；本篇與資料片不算同一款；名字相近但其實是不同作品的不算同一款",
        },
      },
      relation: {
        type: "choice",
        instructions: { other_entry: other, question: "`other_entry` 和 state 裡的 entry 是什麼關係？" },
        criteria: RELATION,
      },
      // 年代分開問。把「年份對不上就不是同一款」寫進 same_game 的 criteria 試過，
      // 16 組難題從 10 對掉到 6 對——那批本來就是照年代分歧篩出來的，等於全部否決。
      era_mismatch: {
        type: "noul",
        instructions: {
          other_entry: other,
          question:
            "只看年代：`other_entry` 被台灣雜誌提到的 article_year_range，跟 upstream_match 的 description 所描述的那款遊戲的推出年代，有沒有對不上？",
        },
        criteria: {
          true: "對不上。other_entry 的年份明顯晚於或早於 description 講的那款遊戲，像是同名的另一款作品或系列的另一代",
          false: "對得上。年份落在 description 那款遊戲在台灣流通的合理期間內（含代理商後續改名重新發行）",
        },
      },
    },
  };

  for (let attempt = 0; ; attempt++) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) return (await response.json()).answers as Answers;
    if (attempt >= 3 || ![429, 502, 503].includes(response.status)) {
      throw new Error(`HTTP ${response.status} ${(await response.text()).slice(0, 200)}`);
    }
    await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
  }
}

function triage(same: number, era: number, multiClaim: string): string {
  if (multiClaim) return "送人工";
  if (era >= ERA_MISMATCH_FLAG) return "送人工";
  if (same >= SAME_GAME_MERGE) return "建議合併";
  if (same < SAME_GAME_REJECT) return "建議不合";
  return "逐對看";
}

/**
 * 站上每一筆條目被哪幾個上游條目認領。認領超過一個就是 jev 看不見的錯。
 *
 * jev 一次只看一對，不知道同一筆條目在別組也出現。站上的《方程式賽車》同時被
 * cdg-2368《方程式機車賽》（The Cycles，機車競速）與 cdg-0080《GP大賽車》
 * （Grand Prix Circuit，賽車）認領——兩款是共用引擎的姊妹作，別名互相污染，
 * 而它只能是其中一個，所以兩組裡必有一組是錯的。2026-09-22 抽驗 20 對時，
 * 唯一的那個錯就是這麼來的。
 *
 * 這件事純粹數一下就看得出來，不必問模型，所以不管分數多高一律送人工。
 */
function claimsByEntry(rows: Candidate[]): Map<string, Set<string>> {
  const claims = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = claims.get(row.tocr_id) ?? new Set<string>();
    set.add(row.cdg_id);
    claims.set(row.tocr_id, set);
  }
  return claims;
}

/** 這一對的兩筆條目裡，被別組也認領的那些上游 id。空字串表示沒有。 */
function multiClaimOf(a: Candidate, b: Candidate, claims: Map<string, Set<string>>): string {
  const others = new Set<string>();
  for (const side of [a, b]) {
    for (const cdgId of claims.get(side.tocr_id) ?? []) {
      if (cdgId !== a.cdg_id) others.add(cdgId);
    }
  }
  return [...others].sort().join("、");
}

const TRIAGE_ORDER = ["建議合併", "逐對看", "送人工", "建議不合", "缺上游"];

const COLUMNS = [
  "triage",
  "multi_claim",
  "cdg_id",
  "bucket",
  "cdg_title",
  "cdg_year",
  "cdg_platform",
  "a_id",
  "a_name",
  "a_articles",
  "a_years",
  "b_id",
  "b_name",
  "b_articles",
  "b_years",
  "jev_same_game",
  "jev_relation",
  "jev_relation_conf",
  "jev_era_mismatch",
  "decision",
] as const;

/** 同時最多 CONCURRENCY 個請求，保持輸入順序。 */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    })
  );
  return results;
}

async function main() {
  const apiKey = /^JEV_API_KEY=(.+)$/m
    .exec(readFileSync(".env.local", "utf8"))?.[1]
    .trim()
    .replace(/^["']|["']$/g, "");
  if (!apiKey) {
    console.error(".env.local 缺 JEV_API_KEY");
    process.exitCode = 1;
    return;
  }

  const rows = parseCsv(readFileSync(IN_PATH, "utf8")) as unknown as Candidate[];
  const groups = new Map<string, Candidate[]>();
  for (const row of rows) {
    groups.set(row.cdg_id, [...(groups.get(row.cdg_id) ?? []), row]);
  }

  // 組內兩兩比。三筆一組的判決常常不一致，而那是對的——《極道梟雄》該併進
  // SYNDICATE，但同組的資料片《美洲風暴》不該；逐對問才看得出這個分野。
  const pairs: [Candidate, Candidate][] = [];
  for (const members of groups.values()) {
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) pairs.push([members[i], members[j]]);
    }
  }

  const missing = [...groups.keys()].filter((id) => readUpstream(id) === null);
  if (missing.length) {
    console.error(`本地缺 ${missing.length} 筆上游條目：${missing.slice(0, 10).join("、")}`);
  }
  console.error(`${groups.size} 組 / ${pairs.length} 對`);

  const claims = claimsByEntry(rows);

  const output = await mapLimit(pairs, CONCURRENCY, async ([a, b]) => {
    const upstream = readUpstream(a.cdg_id);
    const answers = upstream ? await ask(a, b, upstream, apiKey) : null;
    const same = answers?.same_game.noul;
    const era = answers?.era_mismatch.noul;
    const multiClaim = multiClaimOf(a, b, claims);
    return {
      triage: answers ? triage(same!, era!, multiClaim) : "缺上游",
      multi_claim: multiClaim,
      cdg_id: a.cdg_id,
      bucket: a.bucket,
      cdg_title: a.cdg_title,
      cdg_year: a.year,
      cdg_platform: a.cdg_platform,
      a_id: a.tocr_id,
      a_name: a.tocr_name,
      a_articles: a.articles,
      a_years: a.years,
      b_id: b.tocr_id,
      b_name: b.tocr_name,
      b_articles: b.articles,
      b_years: b.years,
      jev_same_game: same?.toFixed(3) ?? "",
      jev_relation: answers?.relation.choice ?? "",
      jev_relation_conf: answers?.relation.confidence.toFixed(3) ?? "",
      jev_era_mismatch: era?.toFixed(3) ?? "",
      decision: "",
    } as Record<(typeof COLUMNS)[number], string>;
  });

  output.sort(
    (x, y) =>
      TRIAGE_ORDER.indexOf(x.triage) - TRIAGE_ORDER.indexOf(y.triage) ||
      Number(y.jev_same_game) - Number(x.jev_same_game)
  );

  const csv = [
    COLUMNS.join(","),
    ...output.map((row) => COLUMNS.map((c) => escapeCsvField(row[c])).join(",")),
  ].join("\n");
  writeFileSync(OUT_PATH, `${csv}\n`);

  const counts = new Map<string, number>();
  for (const row of output) counts.set(row.triage, (counts.get(row.triage) ?? 0) + 1);
  console.error(
    `\n${TRIAGE_ORDER.filter((t) => counts.has(t))
      .map((t) => `${t} ${counts.get(t)}`)
      .join("、")}\n→ ${OUT_PATH}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
