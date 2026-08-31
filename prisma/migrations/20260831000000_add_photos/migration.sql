-- 額外圖片。原本的 magazines.photos 是純網址陣列，記不住出處，也分不出哪些
-- 圖還沒確認來路、不該公開。設計見 docs/plans/2026-08-31-photos-design.md。

CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "magazine_id" TEXT,
    "issue_id" TEXT,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "source_name" TEXT,
    "source_url" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- 掛雜誌或掛單期，二擇一。Prisma 的 schema 表達不了 XOR，所以這條約束只活在
-- 這裡：沒有它，一張圖可以同時掛兩邊、或哪邊都不掛而永遠沒人看得到。
ALTER TABLE "photos" ADD CONSTRAINT "photos_one_owner"
    CHECK (("magazine_id" IS NULL) <> ("issue_id" IS NULL));

CREATE INDEX "photos_magazine_id_order_idx" ON "photos"("magazine_id", "order");
CREATE INDEX "photos_issue_id_order_idx" ON "photos"("issue_id", "order");

ALTER TABLE "photos" ADD CONSTRAINT "photos_magazine_id_fkey"
    FOREIGN KEY ("magazine_id") REFERENCES "magazines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "photos" ADD CONSTRAINT "photos_issue_id_fkey"
    FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 搬既有的藏書照。WITH ORDINALITY 把陣列原本的順序變成 "order"，搬完顯示順序
-- 不變；is_public 為真是因為這批現在就在刊系頁上，遷移不該悄悄把它們藏起來。
--
-- id 用 gen_random_uuid()：cuid 產不出來，而這裡只需要一個不重複的字串。
INSERT INTO "photos" ("id", "magazine_id", "url", "is_public", "order", "created_at", "updated_at")
SELECT gen_random_uuid()::text, m."id", p."url", true, p."ord" - 1, m."created_at", CURRENT_TIMESTAMP
FROM "magazines" m, unnest(m."photos") WITH ORDINALITY AS p("url", "ord");

ALTER TABLE "magazines" DROP COLUMN "photos";
