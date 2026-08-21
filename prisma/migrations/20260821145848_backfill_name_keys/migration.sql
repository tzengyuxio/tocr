-- Fill in the keys for rows that existed before the column did.
--
-- The expression has to say the same thing as nameKey() in
-- src/lib/name-match.ts: NFKC, lower case, then keep only ASCII alphanumerics
-- and CJK. Separators go too -- 「銀河飛將 II」 and 「銀河飛將II」 are one game.
--
-- Done here rather than in a script so that production is correct the moment
-- the migration lands: the deploy runs `prisma migrate deploy` before the
-- build, and a window where every key is empty is a window where recognition
-- creates duplicates again.

UPDATE "games" SET "name_keys" = (
  SELECT COALESCE(array_agg(DISTINCT s.k), ARRAY[]::TEXT[])
  FROM (
    SELECT regexp_replace(lower(normalize(n, NFKC)), '[^a-z0-9一-鿿]', '', 'g') AS k
    FROM unnest(
      ARRAY["name", "name_en", "name_original"] || "aliases"
    ) AS n
    WHERE n IS NOT NULL
  ) s
  WHERE s.k <> ''
);

UPDATE "tags"
SET "name_key" = regexp_replace(lower(normalize("name", NFKC)), '[^a-z0-9一-鿿]', '', 'g');
