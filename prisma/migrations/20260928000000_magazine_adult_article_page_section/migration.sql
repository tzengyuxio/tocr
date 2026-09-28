-- AlterTable
ALTER TABLE "magazines" ADD COLUMN     "adult" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "page_section" TEXT;
