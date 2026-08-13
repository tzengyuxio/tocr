-- Store the column type as a key rather than its Chinese label. The label was
-- reworded twice, and each rewording needed a data migration; a key lets the
-- wording change in code alone.
CREATE TYPE "ArticleCategory" AS ENUM (
  'FEATURE',
  'PREVIEW',
  'REVIEW',
  'WALKTHROUGH',
  'NEWS',
  'INTERVIEW',
  'HARDWARE',
  'COMIC',
  'RANKING',
  'RELEASE_SCHEDULE',
  'READER',
  'SERIAL',
  'OTHER'
);

-- Existing labels, including ones from before the vocabulary was tidied
-- ("評測" predates "遊戲評測"). Anything unrecognised lands in OTHER rather
-- than blocking the migration.
ALTER TABLE "articles"
  ALTER COLUMN "category" TYPE "ArticleCategory"
  USING (
    CASE NULLIF(TRIM("category"), '')
      WHEN '特輯' THEN 'FEATURE'
      WHEN '特輯/專題' THEN 'FEATURE'
      WHEN '新作預覽' THEN 'PREVIEW'
      WHEN '預覽' THEN 'PREVIEW'
      WHEN '遊戲評測' THEN 'REVIEW'
      WHEN '評測' THEN 'REVIEW'
      WHEN '評測/Review' THEN 'REVIEW'
      WHEN '攻略' THEN 'WALKTHROUGH'
      WHEN '新聞' THEN 'NEWS'
      WHEN '新聞/News' THEN 'NEWS'
      WHEN '訪談' THEN 'INTERVIEW'
      WHEN '人物/訪談' THEN 'INTERVIEW'
      WHEN '硬體' THEN 'HARDWARE'
      WHEN '硬體/周邊' THEN 'HARDWARE'
      WHEN '漫畫' THEN 'COMIC'
      WHEN '排行榜' THEN 'RANKING'
      WHEN '預定發售表' THEN 'RELEASE_SCHEDULE'
      WHEN '讀者投稿' THEN 'READER'
      WHEN '連載' THEN 'SERIAL'
      WHEN '其他' THEN 'OTHER'
      WHEN NULL THEN NULL
      ELSE 'OTHER'
    END
  )::"ArticleCategory";
