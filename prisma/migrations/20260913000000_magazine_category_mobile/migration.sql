-- AlterEnum
-- 手遊分類。PostgreSQL 12 起 ADD VALUE 可以在交易內執行，只要同一個交易裡不使用
-- 這個新值——本檔只加值不寫資料，所以不必拆成兩次部署。
ALTER TYPE "MagazineCategory" ADD VALUE 'MOBILE_GAME';
