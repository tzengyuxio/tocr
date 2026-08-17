-- AlterTable
ALTER TABLE "issues" ADD COLUMN     "alt_numbers" TEXT[] DEFAULT ARRAY[]::TEXT[];
