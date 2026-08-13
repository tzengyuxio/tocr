-- AlterTable
ALTER TABLE "edit_logs" ADD COLUMN     "batch_id" TEXT,
ADD COLUMN     "batch_size" INTEGER;

-- CreateIndex
CREATE INDEX "edit_logs_batch_id_idx" ON "edit_logs"("batch_id");
