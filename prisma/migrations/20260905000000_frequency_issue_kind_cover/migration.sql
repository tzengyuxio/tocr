-- 發刊頻率、刊種與封面資訊。只新增，不動既有欄位與資料。
-- 設計見 docs/plans/2026-09-05-frequency-issue-kind-cover-design.md。

CREATE TYPE "MagazineFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'SEMIMONTHLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'IRREGULAR');

-- 站上「收錄 N 期」的定義。DEFAULT 'REGULAR' 讓既有的期不必回填就有身分；
-- 試刊與特刊由 scripts/backfill-issue-kind.ts 之後改過去。
CREATE TYPE "IssueKind" AS ENUM ('REGULAR', 'PILOT', 'SPECIAL');

ALTER TABLE "magazines" ADD COLUMN "frequency" "MagazineFrequency";

ALTER TABLE "issues" ADD COLUMN "kind" "IssueKind" NOT NULL DEFAULT 'REGULAR';
ALTER TABLE "issues" ADD COLUMN "cover_games" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "issues" ADD COLUMN "cover_subjects" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "issues" ADD COLUMN "cover_credit" TEXT;
