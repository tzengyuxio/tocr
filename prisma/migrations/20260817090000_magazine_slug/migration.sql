-- Magazine.slug: the readable handle public URLs carry.
--
-- The values are not derived from the name. They come from nostalibrary
-- (gitlab.com/tzengyuxio/nostalibrary, content/magazines/<slug>/), which has
-- assigned them for years -- reusing them keeps one identifier across both
-- sites. Three have no upstream entry and get new ids here, taken from their
-- English titles: astro (ASTRO TV GAMES MAGAZINE), rgt (RETRO GAME TIME) and
-- gamexpress (GAMEXPRESS MAGAZINE).
--
-- Backfilled here rather than in a script because the column is NOT NULL:
-- `prisma migrate deploy` runs on the production build, so this is the only
-- step that is guaranteed to happen before the constraint lands.

ALTER TABLE "magazines" ADD COLUMN "slug" TEXT;

UPDATE "magazines" m
SET "slug" = v.slug
FROM (
  VALUES
    ('精訊電腦', 'jxdn'),
    ('軟體世界雜誌', 'swm'),
    ('軟體之星', 'ssm'),
    ('電腦玩家雜誌', 'ace'),
    ('電腦遊戲世界', 'cgw'),
    ('新遊戲時代雜誌', 'sgm'),
    ('電玩族雜誌', 'gpeople'),
    ('次世代遊戲情報', 'next'),
    ('遊戲設計大師', 'gd'),
    ('Mania 遊戲玩瘋誌', 'mania'),
    ('電遊人', 'gwalker'),
    ('華泰任天堂秘笈', 'htntd'),
    ('電視遊樂雜誌', 'tvgm'),
    ('電視遊樂報導', 'tvgr'),
    ('星際遊樂雜誌', 'astro'),
    ('勝利小子', 'vvkids'),
    ('攻略快報', 'tvgsg'),
    ('電遊通訊', 'tvgameinfo'),
    ('勝利少年', 'vboy'),
    ('電玩時代', 'gtimes'),
    ('電擊PlayStation', 'dps-tw'),
    ('電擊SEGA SATURN', 'dss-tw'),
    ('疾風快報', 'wolf'),
    ('新世紀 HYPER PlayStation', 'hps-tw'),
    ('飛訊電玩周刊', 'fashion'),
    ('電玩百分百週刊', 'game100'),
    ('電擊王', 'doh-tw'),
    ('電玩e世代', 'egen'),
    ('Official Xbox Magazine', 'oxm'),
    ('電玩通', 'fmt-tw'),
    ('舊遊戲時代', 'rgt'),
    ('電玩宅速配', 'gamexpress')
) AS v(name, slug)
WHERE m."name" = v.name;

-- A magazine created after this migration was written keeps its cuid as the
-- slug: the URL still resolves and nothing 404s, it just stays unreadable
-- until an editor gives it a real one.
UPDATE "magazines" SET "slug" = "id" WHERE "slug" IS NULL;

ALTER TABLE "magazines" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "magazines_slug_key" ON "magazines"("slug");
