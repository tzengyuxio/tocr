-- The OCR prompt listed some categories with an English gloss ("評測/Review"),
-- and the model stored the whole label, so the same category could arrive in
-- two spellings once the prompt was corrected. Fold the old values in.
--
-- Only the bilingual pairs are touched. Labels such as "特輯/專題" keep their
-- slash: there it separates two Chinese terms rather than a translation.
UPDATE "articles" SET "category" = '評測' WHERE "category" = '評測/Review';
UPDATE "articles" SET "category" = '新聞' WHERE "category" = '新聞/News';

-- Recognition results that have not been reviewed into articles yet carry the
-- same labels inside their JSON payload.
UPDATE "ocr_records"
SET "raw_result" = REPLACE(
      REPLACE("raw_result"::text, '"評測/Review"', '"評測"'),
      '"新聞/News"', '"新聞"'
    )::jsonb
WHERE "raw_result"::text LIKE '%評測/Review%'
   OR "raw_result"::text LIKE '%新聞/News%';
