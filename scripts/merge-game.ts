/**
 * 把重複的遊戲條目合併成一筆。
 *
 * 同一款遊戲被建成兩筆的情況，最常見的來源是不同期的目錄抄寫不同（`P-47`
 * 與 `P.47`）。名稱完全相同的反而不會發生——那會在建立時就比對到。判準與
 * 「合併 vs 剔除」的界線見 docs/data-conventions.md 的「重複條目怎麼歸類」。
 *
 * 邏輯在 src/lib/merge-game.ts，與後台的「合併」按鈕（POST /api/games/[id]/merge）
 * 共用同一份，兩邊留下的編輯紀錄才會長一樣。這支腳本是給不方便開後台的場合用的
 * ——例如剛跑完匯入、手上只有一串 id。
 *
 * 用法：
 *   npx tsx --env-file=<env> scripts/merge-game.ts <keeperId> <loserId> [--apply]
 *
 * 不帶 --apply 就是 dry run，只印出會做什麼。
 */
import { prisma } from "../src/lib/prisma";
import { API_USER } from "../src/lib/api-token";
import { applyGameMerge, planGameMerge } from "../src/lib/merge-game";

const [keeperId, loserId] = process.argv.slice(2);
const apply = process.argv.includes("--apply");

async function main() {
  if (!keeperId || !loserId) {
    console.error("用法：merge-game.ts <keeperId> <loserId> [--apply]");
    process.exitCode = 1;
    return;
  }

  const select = {
    id: true,
    name: true,
    slug: true,
    aliases: true,
    createdAt: true,
    articleGames: { select: { articleId: true, isPrimary: true } },
  } as const;

  const [keeper, loser] = await Promise.all([
    prisma.game.findUnique({ where: { id: keeperId }, select }),
    prisma.game.findUnique({ where: { id: loserId }, select }),
  ]);

  if (!keeper || !loser) {
    console.error(`找不到條目：${!keeper ? keeperId : loserId}`);
    process.exitCode = 1;
    return;
  }

  const toCandidate = (game: typeof keeper) => ({
    ...game,
    links: game.articleGames,
  });

  const plan = planGameMerge(toCandidate(keeper), toCandidate(loser));

  console.log(`保留：${keeper.name} [${keeper.slug}] ${keeper.id}`);
  console.log(`刪除：${loser.name} [${loser.slug}] ${loser.id}`);
  console.log(
    `關聯：搬 ${plan.movedArticleIds.length} 筆，${plan.discardedLinkCount} 筆已存在於保留方（直接丟棄）`
  );
  console.log(`別名：${plan.mergedAliases.join("、") || "（無）"}`);
  if (plan.promotedArticleIds.length > 0) {
    console.log(`主要遊戲：${plan.promotedArticleIds.length} 篇文章的主要遊戲改記在保留方`);
  }

  if (!apply) {
    console.log("\n這是 dry run。要實際執行請加 --apply");
    return;
  }

  await prisma.$transaction((tx) =>
    applyGameMerge(
      tx,
      plan,
      // Unattended, like every other write the 司書 makes.
      { userId: API_USER.id, via: "token" },
      loser.name
    )
  );

  console.log("\n完成。");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
