-- Rename rather than drop: `name_original` holds one real value
-- (次世代遊戲情報 = "Next Generation"), and that value is already a parallel
-- title under the new semantics. Two other rows hold empty strings, normalised
-- to NULL below.
ALTER TABLE "magazines" RENAME COLUMN "name_original" TO "name_parallel";

-- The index name has trailed the column through two renames without the column
-- ever being used. Renaming keeps the index (and its GIN build) in place.
ALTER INDEX "idx_magazines_name_en_trgm" RENAME TO "idx_magazines_name_parallel_trgm";

UPDATE "magazines" SET "name_parallel" = NULL WHERE "name_parallel" = '';

ALTER TABLE "magazines" ADD COLUMN "source_title" TEXT;

ALTER TABLE "magazine_titles" ADD COLUMN "title_parallel" TEXT;
