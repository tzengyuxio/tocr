-- AlterTable
ALTER TABLE "games" ADD COLUMN     "name_keys" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "tags" ADD COLUMN     "name_key" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "idx_games_name_keys" ON "games" USING GIN ("name_keys");

-- CreateIndex
CREATE INDEX "tags_name_key_type_idx" ON "tags"("name_key", "type");
