-- Records when a person confirmed the table of contents. Written by hand
-- rather than by `prisma migrate dev`: several search indexes live only in SQL
-- migrations, so the generated diff wants to drop them as drift.
ALTER TABLE "issues" ADD COLUMN "toc_reviewed_at" TIMESTAMP(3);
