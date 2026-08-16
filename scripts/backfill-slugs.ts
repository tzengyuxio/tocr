/**
 * 把 games/tags 既有的 `名稱-1786879739750` 換成可讀 slug。
 *
 * 時間戳後綴是 OCR 建立關聯時為了保證唯一而加的，代價是每個 slug 都不能當
 * 網址用。改用「撞到才接 -2」之後，既有資料要重算一次。
 *
 * 冪等：以 createdAt, id 穩定排序重算，重跑不會把 -2 掛到不同一筆上。
 * dev 與 production 要各跑一次。
 *
 * 用法：npx tsx --env-file=.env.local scripts/backfill-slugs.ts
 *
 * 沿用 src/lib/prisma 的 client -- Prisma 7 要 driver adapter，重新 new 一個
 * 就得把連線設定抄第二份。
 */
import { prisma } from "../src/lib/prisma";
import { slugify } from "../src/lib/slugify";

async function backfill(model: "game" | "tag") {
  const rows =
    model === "game"
      ? await prisma.game.findMany({
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true, name: true, slug: true },
        })
      : await prisma.tag.findMany({
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true, name: true, slug: true },
        });

  // 唯一性靠記憶體裡的 Set，不查資料庫 -- 整批一起重算時庫裡還是舊 slug。
  const taken = new Set<string>();
  let changed = 0;

  for (const row of rows) {
    const base = slugify(row.name) || model;
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    taken.add(slug);

    if (slug !== row.slug) {
      if (model === "game") {
        await prisma.game.update({ where: { id: row.id }, data: { slug } });
      } else {
        await prisma.tag.update({ where: { id: row.id }, data: { slug } });
      }
      changed++;
      console.log(`  ${row.name}: ${row.slug} -> ${slug}`);
    }
  }

  console.log(`${model}: ${changed}/${rows.length} updated`);
}

async function main() {
  await backfill("game");
  await backfill("tag");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
