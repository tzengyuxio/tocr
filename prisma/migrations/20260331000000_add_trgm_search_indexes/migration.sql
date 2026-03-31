-- Enable pg_trgm extension for trigram-based similarity search
-- This dramatically improves ILIKE/LIKE query performance on text columns
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes for article search (title, subtitle, summary)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_title_trgm ON articles USING GIN (title gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_subtitle_trgm ON articles USING GIN (subtitle gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_summary_trgm ON articles USING GIN (summary gin_trgm_ops);

-- GIN trigram indexes for magazine search (name, name_en, publisher)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_magazines_name_trgm ON magazines USING GIN (name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_magazines_name_en_trgm ON magazines USING GIN (name_en gin_trgm_ops);

-- GIN trigram indexes for game search (name, name_en, name_original)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_name_trgm ON games USING GIN (name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_name_en_trgm ON games USING GIN (name_en gin_trgm_ops);

-- GIN trigram index for tag search (name)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tags_name_trgm ON tags USING GIN (name gin_trgm_ops);
