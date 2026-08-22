-- AlterTable
ALTER TABLE "issues" ADD COLUMN     "complete_at" TIMESTAMP(3),
ADD COLUMN     "complete_stale_at" TIMESTAMP(3);
