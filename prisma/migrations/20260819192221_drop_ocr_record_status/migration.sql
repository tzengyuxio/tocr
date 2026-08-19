-- AlterTable
ALTER TABLE "ocr_records" DROP COLUMN "status",
DROP COLUMN "error_message";

-- DropEnum
DROP TYPE "OcrStatus";
