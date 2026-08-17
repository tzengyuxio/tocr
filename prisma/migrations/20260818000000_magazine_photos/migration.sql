-- Photographs of the physical copies, kept apart from the masthead: one
-- identifies the magazine, the others are evidence that the run exists.

-- AlterTable
ALTER TABLE "magazines" ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];
