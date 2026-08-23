-- CreateTable
CREATE TABLE "magazine_slugs" (
    "id" TEXT NOT NULL,
    "magazine_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "retired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magazine_slugs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "magazine_slugs_slug_key" ON "magazine_slugs"("slug");

-- CreateIndex
CREATE INDEX "magazine_slugs_magazine_id_idx" ON "magazine_slugs"("magazine_id");

-- AddForeignKey
ALTER TABLE "magazine_slugs" ADD CONSTRAINT "magazine_slugs_magazine_id_fkey" FOREIGN KEY ("magazine_id") REFERENCES "magazines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
