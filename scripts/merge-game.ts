/**
 * 把重複的遊戲條目合併成一筆。
 *
 * 同一款遊戲被建成兩筆的情況，最常見的來源是不同期的目錄抄寫不同（`P-47`
 * 與 `P.47`）。名稱完全相同的反而不會發生——那會在建立時就比對到。判準與
 * 「合併 vs 剔除」的界線見 docs/data-conventions.md 的「重複條目怎麼歸類」。
 *
 * 做的事：把 loser 的文章關聯搬到 keeper（已經有的就跳過，避免違反 unique）、
 * 留一筆 DELETE 的編輯紀錄、刪掉 loser。全部在一個 transaction 裡。
 *
 * 用法：
 *   npx tsx --env-file=<env> scripts/merge-game.ts <keeperId> <loserId> [--apply]
 *
 * 不帶 --apply 就是 dry run，只印出會做什麼。
 */
import { prisma } from "../src/lib/prisma";

const [keeperId, loserId] = process.argv.slice(2);
const apply = process.argv.includes("--apply");

async function main() {
  if (!keeperId || !loserId) {
    console.error("用法：merge-game.ts <keeperId> <loserId> [--apply]");
    process.exitCode = 1;
    return;
  }

  const [keeper, loser] = await Promise.all([
    prisma.game.findUnique({
      where: { id: keeperId },
      include: { articleGames: { select: { articleId: true } } },
    }),
    prisma.game.findUnique({
      where: { id: loserId },
      include: { articleGames: { select: { articleId: true, isPrimary: true } } },
    }),
  ]);

  if (!keeper || !loser) {
    console.error(`找不到條目：${!keeper ? keeperId : loserId}`);
    process.exitCode = 1;
    return;
  }

  const keeperArticles = new Set(keeper.articleGames.map((ag) => ag.articleId));
  const toMove = loser.articleGames.filter((ag) => !keeperArticles.has(ag.articleId));
  const alreadyLinked = loser.articleGames.length - toMove.length;

  console.log(`保留：${keeper.name} [${keeper.slug}] ${keeper.id}`);
  console.log(`刪除：${loser.name} [${loser.slug}] ${loser.id}`);
  console.log(`關聯：搬 ${toMove.length} 筆，${alreadyLinked} 筆已存在於保留方（直接丟棄）`);

  if (!apply) {
    console.log("\n這是 dry run。要實際執行請加 --apply");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const ag of toMove) {
      await tx.articleGame.updateMany({
        where: { articleId: ag.articleId, gameId: loserId },
        data: { gameId: keeperId },
      });
    }

    // 刪除會 cascade 掉剩下的關聯，那些是保留方已經有的重複。
    await tx.editLog.create({
      data: {
        userId: "api-token",
        entityType: "Game",
        entityId: loserId,
        action: "DELETE",
        changes: {
          reason: "merged duplicate",
          mergedInto: keeperId,
          name: { from: loser.name, to: null },
          movedArticleLinks: toMove.length,
          discardedDuplicateLinks: alreadyLinked,
        },
      },
    });

    await tx.game.delete({ where: { id: loserId } });
  });

  console.log("\n完成。");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
