-- Issues carry the same date problem as magazines: the cover often gives only
-- a month, a season, or a year. Store EDTF (ISO 8601-2) and keep a derived
-- timestamp for ordering. See docs/data-conventions.md.

-- Derive the ordering key from the existing values before changing the type.
ALTER TABLE "issues" ADD COLUMN "publish_sort" TIMESTAMP(3);
UPDATE "issues" SET "publish_sort" = "publish_date";
ALTER TABLE "issues" ALTER COLUMN "publish_sort" SET NOT NULL;

-- Existing values are full-precision dates, which is already valid EDTF.
ALTER TABLE "issues"
  ALTER COLUMN "publish_date" TYPE TEXT USING to_char("publish_date", 'YYYY-MM-DD');

DROP INDEX IF EXISTS "issues_publish_date_idx";
CREATE INDEX "issues_publish_sort_idx" ON "issues" ("publish_sort");
