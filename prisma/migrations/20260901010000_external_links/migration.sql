-- 站外的雜誌資訊：全本掃描、上游條目、書目紀錄。只新增，不動既有欄位。

CREATE TYPE "ExternalSite" AS ENUM ('INTERNET_ARCHIVE', 'NOSTALIBRARY', 'NCL', 'WIKIPEDIA', 'OTHER');

CREATE TABLE "external_links" (
    "id" TEXT NOT NULL,
    "magazine_id" TEXT,
    "issue_id" TEXT,
    "site" "ExternalSite" NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_links_pkey" PRIMARY KEY ("id")
);

-- 掛雜誌或掛單期，二擇一。同 photos_one_owner：Prisma 表達不了 XOR。
ALTER TABLE "external_links" ADD CONSTRAINT "external_links_one_owner"
    CHECK (("magazine_id" IS NULL) <> ("issue_id" IS NULL));

CREATE INDEX "external_links_magazine_id_order_idx" ON "external_links"("magazine_id", "order");
CREATE INDEX "external_links_issue_id_order_idx" ON "external_links"("issue_id", "order");

ALTER TABLE "external_links" ADD CONSTRAINT "external_links_magazine_id_fkey"
    FOREIGN KEY ("magazine_id") REFERENCES "magazines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_links" ADD CONSTRAINT "external_links_issue_id_fkey"
    FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
