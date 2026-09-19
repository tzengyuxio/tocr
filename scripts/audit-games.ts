/**
 * 遊戲條目的資料體檢：印出每一類髒資料的筆數與樣本。
 *
 * 站上 6,700 多筆遊戲幾乎只有名字（nameEn 一筆都沒有、platforms 全空），而名字
 * 本身也帶著目錄抄寫的痕跡——夾在括號裡的英文原名、全形羅馬數字、被當成遊戲名
 * 的標語。整理只能分批做，所以先要有一支能重跑的尺，每清一批就再量一次。
 *
 * **唯讀**，不寫任何資料。判斷規則在 src/lib/game-audit.ts（那裡有 jest）。
 *
 * 用法：
 *   npx tsx --env-file=.env.local scripts/audit-games.ts [--only=<check>] [--csv=<dir>]
 *   npx tsx scripts/audit-games.ts --prod [--only=<check>] [--csv=<dir>]
 *
 * `--prod` 當場從 Keychain 取正式站的連線字串（`tocr-prod-db-url`），理由與
 * `prod-token.ts` 相同：`vercel env pull` 拉下來的 .env.production.local 把
 * DATABASE_URL 遮成字面的 `[SENSITIVE]`，而多存一份明碼進 repo 只是讓它有機會
 * 被 grep 出來、貼進對話。存放方式見 docs/deployment.md。
 *
 * 預設只印摘要。要逐筆判斷就加 --csv，每項檢查落一個檔，附上該遊戲掛在哪幾篇
 * 文章上——撞名的那幾組要看文章才分得出「同一款的兩種抄法」與「同名的兩款遊戲」。
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { escapeCsvField } from "../src/lib/csv/escape";
import { auditGames, type AuditGame, type AuditRow } from "../src/lib/game-audit";

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith("--only="))?.slice("--only=".length);
const csvDir = args.find((a) => a.startsWith("--csv="))?.slice("--csv=".length);
const prod = args.includes("--prod");

/** 正式站的連線字串，存在 Keychain 而不是檔案裡——見檔頭。 */
const PROD_DB_SERVICE = "tocr-prod-db-url";

type Prisma = typeof import("../src/lib/prisma").prisma;

/** 樣本印幾筆就夠看出是什麼東西，再多就該去看 CSV。 */
const SAMPLE = 6;

async function loadGames(prisma: Prisma): Promise<AuditGame[]> {
  const games = await prisma.game.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      nameEn: true,
      nameOriginal: true,
      aliases: true,
      nameKeys: true,
      platforms: true,
      genres: true,
      releaseDate: true,
      developer: true,
      publisher: true,
      coverImage: true,
      description: true,
      _count: { select: { articleGames: true } },
    },
    orderBy: { name: "asc" },
  });

  return games.map(({ _count, ...game }) => ({
    ...game,
    articleCount: _count.articleGames,
  }));
}

/** 「雜誌 期號 p.頁碼 標題」，最多三篇——CSV 是拿來判斷的，不是拿來讀全文的。 */
async function loadArticleSamples(
  prisma: Prisma,
  gameIds: string[]
): Promise<Map<string, string>> {
  if (gameIds.length === 0) return new Map();

  const links = await prisma.articleGame.findMany({
    where: { gameId: { in: gameIds } },
    select: {
      gameId: true,
      article: {
        select: {
          title: true,
          pageStart: true,
          issue: {
            select: { issueNumber: true, magazine: { select: { name: true } } },
          },
        },
      },
    },
  });

  const byGame = new Map<string, string[]>();
  for (const { gameId, article } of links) {
    const where = `${article.issue.magazine.name} ${article.issue.issueNumber}`;
    const page = article.pageStart ? ` p.${article.pageStart}` : "";
    byGame.set(gameId, [...(byGame.get(gameId) ?? []), `${where}${page} ${article.title}`]);
  }

  return new Map(
    [...byGame].map(([gameId, all]) => [
      gameId,
      all.slice(0, 3).join(" / ") + (all.length > 3 ? ` …共 ${all.length} 篇` : ""),
    ])
  );
}

function writeCsv(dir: string, key: string, rows: AuditRow[], samples: Map<string, string>) {
  const header = "group,id,name,slug,articles,note,articles_sample";
  const lines = rows.map((row) =>
    [
      row.group,
      row.id,
      row.name,
      row.slug,
      String(row.articles),
      row.note,
      samples.get(row.id) ?? "",
    ]
      .map(escapeCsvField)
      .join(",")
  );

  const path = join(dir, `${key}.csv`);
  writeFileSync(path, [header, ...lines].join("\n") + "\n");
  return path;
}

async function main() {
  if (prod) {
    // 設在 import 之前：src/lib/prisma.ts 是在載入當下就拿 DATABASE_URL 建連線池的。
    process.env.DATABASE_URL = execFileSync("security", [
      "find-generic-password", "-s", PROD_DB_SERVICE, "-a", process.env.USER ?? "", "-w",
    ]).toString().trim();
  }
  const { prisma } = await import("../src/lib/prisma");
  try {
    await report(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function report(prisma: Prisma) {
  const games = await loadGames(prisma);
  const checks = auditGames(games).filter((c) => !only || c.key === only);

  if (checks.length === 0) {
    console.error(`沒有叫 ${only} 的檢查`);
    process.exitCode = 1;
    return;
  }

  if (csvDir) mkdirSync(csvDir, { recursive: true });

  const samples = csvDir
    ? await loadArticleSamples(prisma, [
        ...new Set(checks.flatMap((c) => c.rows).map((r) => r.id)),
      ])
    : new Map<string, string>();

  console.log(`遊戲 ${games.length} 筆\n`);

  for (const check of checks) {
    console.log(`── ${check.title} [${check.key}]`);
    for (const line of check.summary) console.log(`   ${line}`);

    for (const row of check.rows.slice(0, SAMPLE)) {
      const group = row.group ? `${row.group}  ` : "";
      const note = row.note ? `  ← ${row.note}` : "";
      console.log(`   · ${group}${row.name}（${row.articles} 篇）${note}`);
    }
    if (check.rows.length > SAMPLE) {
      console.log(`   … 另有 ${check.rows.length - SAMPLE} 筆`);
    }

    if (csvDir && check.rows.length > 0) {
      console.log(`   → ${writeCsv(csvDir, check.key, check.rows, samples)}`);
    }
    console.log();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
