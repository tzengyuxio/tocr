-- CreateTable
CREATE TABLE "magazine_titles" (
    "id" TEXT NOT NULL,
    "magazine_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "start_issue_id" TEXT NOT NULL,
    "logo_image" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "magazine_titles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "magazine_titles_start_issue_id_key" ON "magazine_titles"("start_issue_id");

-- CreateIndex
CREATE INDEX "magazine_titles_magazine_id_idx" ON "magazine_titles"("magazine_id");

-- AddForeignKey
ALTER TABLE "magazine_titles" ADD CONSTRAINT "magazine_titles_magazine_id_fkey" FOREIGN KEY ("magazine_id") REFERENCES "magazines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magazine_titles" ADD CONSTRAINT "magazine_titles_start_issue_id_fkey" FOREIGN KEY ("start_issue_id") REFERENCES "issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
