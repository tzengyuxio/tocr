-- Issue.code is a Prisma-level default (nanoid), so the column carries no
-- database default and the existing rows have to be filled in here before it
-- can be NOT NULL.

-- AlterTable
ALTER TABLE "issues" ADD COLUMN     "code" TEXT;

-- Backfill with the same alphabet and length nanoid(8) uses. The WHERE clause
-- correlates the subquery with the outer row on purpose: random() is volatile,
-- but without a reference to "issues" Postgres would hoist the subquery into an
-- InitPlan, evaluate it once and give every row the same code.
--
-- No collision handling: 64^8 is about 2.8e14, so with a few hundred issues the
-- odds are around 1e-9, and the unique index below turns a collision into a
-- failed migration rather than silent damage.
UPDATE "issues" i
SET "code" = (
    SELECT string_agg(
        substr(
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-',
            1 + floor(random() * 64)::int,
            1
        ),
        ''
    )
    FROM generate_series(1, 8)
    WHERE i.id IS NOT NULL
);

ALTER TABLE "issues" ALTER COLUMN "code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "issues_code_key" ON "issues"("code");
