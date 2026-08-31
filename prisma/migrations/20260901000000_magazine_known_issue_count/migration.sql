-- 已知總期數與它的出處。兩欄都可空：查不到、或仍在發行的刊就沒有這個數字。
ALTER TABLE "magazines" ADD COLUMN "known_issue_count" INTEGER;
ALTER TABLE "magazines" ADD COLUMN "known_issue_count_source" TEXT;
