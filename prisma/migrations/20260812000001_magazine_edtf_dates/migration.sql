-- Publication dates are frequently imprecise: a magazine may be known only to
-- the month, the year, or the season ("1994 夏"). A DATE column forces a day to
-- be invented, which then cannot be told apart from a genuinely known day.
--
-- Store EDTF (ISO 8601-2) strings instead: "1989-04-08", "1999-05", "1994",
-- "1994-22". Existing values become full-precision EDTF, which is what they
-- already claimed to be.
ALTER TABLE "magazines"
  ALTER COLUMN "founded_date" TYPE TEXT USING to_char("founded_date", 'YYYY-MM-DD'),
  ALTER COLUMN "ended_date"   TYPE TEXT USING to_char("ended_date", 'YYYY-MM-DD');

-- EDTF strings cannot be ordered directly, so keep the start of the range the
-- value covers alongside it. Populated on write by the application.
ALTER TABLE "magazines" ADD COLUMN "founded_sort" TIMESTAMP(3);

UPDATE "magazines"
   SET "founded_sort" = to_date("founded_date", 'YYYY-MM-DD')
 WHERE "founded_date" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "magazines_founded_sort_idx" ON "magazines" ("founded_sort");
