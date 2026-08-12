-- The remaining slashed category names joined two Chinese terms, which reads
-- as one category carrying two concepts. Keep one word each.
--
-- Only these renames are deterministic. The vocabulary also gains 預覽, 漫畫,
-- 排行榜 and 預定發售表, but rows already filed under 其他 cannot be moved
-- without judging each article, so they stay until re-recognised or edited.
UPDATE "articles" SET "category" = '特輯' WHERE "category" = '特輯/專題';
UPDATE "articles" SET "category" = '訪談' WHERE "category" = '人物/訪談';
UPDATE "articles" SET "category" = '硬體' WHERE "category" = '硬體/周邊';

UPDATE "ocr_records"
SET "raw_result" = REPLACE(
      REPLACE(
        REPLACE("raw_result"::text, '"特輯/專題"', '"特輯"'),
        '"人物/訪談"', '"訪談"'
      ),
      '"硬體/周邊"', '"硬體"'
    )::jsonb
WHERE "raw_result"::text LIKE '%特輯/專題%'
   OR "raw_result"::text LIKE '%人物/訪談%'
   OR "raw_result"::text LIKE '%硬體/周邊%';
