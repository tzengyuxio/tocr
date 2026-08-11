-- An ISSN can legitimately be shared by two magazines: when a title changes,
-- the publisher may carry the serial number over. 電擊王 and 電玩通 both use
-- 1561-8099, and the unique index made the second one impossible to store.
DROP INDEX IF EXISTS "magazines_issn_key";

-- Still worth indexing for lookup, just not as a constraint.
CREATE INDEX IF NOT EXISTS "magazines_issn_idx" ON "magazines" ("issn");
