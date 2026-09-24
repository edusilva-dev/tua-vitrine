import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "./env";

const globalDb = globalThis as unknown as { prisma?: PrismaClient };
const env = getEnv();

function createDb() {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: env.DATABASE_POOL_MAX,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
  });

  if (process.env.VERCEL === "1") attachDatabasePool(pool);

  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const db = globalDb.prisma ?? createDb();

if (process.env.NODE_ENV !== "production") globalDb.prisma = db;
