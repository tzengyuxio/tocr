-- CreateEnum
CREATE TYPE "MagazineCategory" AS ENUM ('PC_GAME', 'TV_GAME', 'ONLINE_GAME');

-- AlterTable
ALTER TABLE "magazines" ADD COLUMN     "categories" "MagazineCategory"[] DEFAULT ARRAY[]::"MagazineCategory"[];
