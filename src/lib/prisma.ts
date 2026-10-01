import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { pinSslMode } from "./database-url";

// Kept on globalThis so dev-mode hot reloads reuse one client and pool.
declare global {
  var __prisma: PrismaClient | undefined;
  var __pgPool: Pool | undefined;
}

// pinSslMode, not the raw variable: pg warns that sslmode=require will lose
// its verification in pg v9, and the connection string lives in the platform's
// environment rather than in the repo, so the fix has to be here.
const connectionString = process.env.DATABASE_URL
  ? pinSslMode(process.env.DATABASE_URL)
  : undefined;

const pool = globalThis.__pgPool ?? new Pool({ connectionString });

const adapter = new PrismaPg(pool);

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
  globalThis.__pgPool = pool;
}

export default prisma;
