-- AlterEnum
-- 巴哈姆特。與 MOBILE_GAME 同一個理由拆法：PostgreSQL 12 起 ADD VALUE 可以在交易
-- 內執行，只要同一個交易裡不使用這個新值——本檔只加值不寫資料。
ALTER TYPE "ExternalSite" ADD VALUE 'BAHAMUT';
