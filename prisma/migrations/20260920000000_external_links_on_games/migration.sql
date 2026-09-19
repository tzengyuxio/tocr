-- 站外連結可以掛在遊戲上。
--
-- 遊戲頁至今一條外部連結都沒有，因為這張表只掛得上雜誌與單期。而三個站要互相
-- 關聯，最直接的接點就是遊戲（見 BACKLOG 的「與 nostalib / cdosgame 兩站的資料
-- 連動」）。

ALTER TYPE "ExternalSite" ADD VALUE 'CDOSGAME';

ALTER TABLE "external_links" ADD COLUMN "game_id" TEXT;

-- 二擇一變三擇一。`<>` 那個寫法只能表達兩欄，換成 num_nonnulls。既有每一列的
-- game_id 都是 NULL，所以舊資料原樣滿足新約束。
ALTER TABLE "external_links" DROP CONSTRAINT "external_links_one_owner";
ALTER TABLE "external_links" ADD CONSTRAINT "external_links_one_owner"
    CHECK (num_nonnulls("magazine_id", "issue_id", "game_id") = 1);

CREATE INDEX "external_links_game_id_order_idx" ON "external_links"("game_id", "order");

ALTER TABLE "external_links" ADD CONSTRAINT "external_links_game_id_fkey"
    FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
