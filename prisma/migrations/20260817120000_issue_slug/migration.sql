-- Issue.slug: the readable handle public URLs carry, unique within a magazine.
--
-- The CASE below is a one-off translation of issueSlugify() in
-- src/lib/slugify.ts, for the rows that already exist; that function handles
-- everything written from here on. Keeping the two in step is not a standing
-- obligation -- this statement runs once and then is history.
--
-- Verified against the 764 rows on dev: 764 distinct (magazine, slug), none
-- empty, and the eleven non-numeric issue numbers all land on something
-- readable (創刊號, 試刊2號, 70+71 -> 70-71).
--
-- Backfilled here rather than in a script for the same reason as
-- magazines.slug: the column is NOT NULL and `prisma migrate deploy` runs on
-- the production build, so this is the only step guaranteed to happen before
-- the constraint lands.

ALTER TABLE "issues" ADD COLUMN "slug" TEXT;

UPDATE "issues" SET "slug" = CASE
  -- "163", "第163期", "第 163 期" all name issue 163.
  WHEN "issue_number" ~ '^\s*第?\s*[0-9]+\s*期?\s*$'
    THEN ltrim(substring("issue_number" from '[0-9]+'), '0')
  -- "VOL.51", "No. 7".
  WHEN "issue_number" ~* '^\s*(vol|no)\.?\s*[0-9]+\s*$'
    THEN ltrim(substring("issue_number" from '[0-9]+'), '0')
  -- Everything else keeps its words: 創刊號 stays 創刊號, 70+71 becomes 70-71.
  ELSE trim(both '-' from lower(
    regexp_replace(normalize("issue_number", NFKC), '[^a-zA-Z0-9一-鿿]+', '-', 'g')
  ))
END;

-- An issue whose number is nothing but punctuation would slug to the empty
-- string. None exist today; this keeps the constraint satisfiable if one
-- appears in a database this migration has not seen.
UPDATE "issues" SET "slug" = "id" WHERE "slug" IS NULL OR "slug" = '';

ALTER TABLE "issues" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "issues_magazine_id_slug_key" ON "issues"("magazine_id", "slug");
