-- Rename nameEn to nameOriginal
ALTER TABLE "magazines" RENAME COLUMN "name_en" TO "name_original";

-- Add aliases array column
ALTER TABLE "magazines" ADD COLUMN "aliases" TEXT[] DEFAULT '{}';

-- Rename coverImage to logoImage
ALTER TABLE "magazines" RENAME COLUMN "cover_image" TO "logo_image";

-- Migrate existing name_original data to aliases if it looks like English
-- (Keep name_original for actual original-language names like Japanese)
-- This is a no-op migration; data can be manually reviewed and moved.
