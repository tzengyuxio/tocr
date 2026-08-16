import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { pinSslMode } from "./database-url";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// pinSslMode, not the raw variable: pg warns that sslmode=require will lose
// its verification in pg v9, and the connection string lives in the platform's
// environment rather than in the repo, so the fix has to be here.
const connectionString = process.env.DATABASE_URL
  ? pinSslMode(process.env.DATABASE_URL)
  : undefined;

const pool = globalForPrisma.pool ?? new Pool({ connectionString });

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

export default prisma;
