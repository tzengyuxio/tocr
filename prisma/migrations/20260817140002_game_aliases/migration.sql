-- AlterTable
ALTER TABLE "games" ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[];
