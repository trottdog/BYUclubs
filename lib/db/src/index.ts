import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const useSsl =
  process.env.PGSSLMODE === "require" ||
  databaseUrl.includes("sslmode=require") ||
  databaseUrl.includes("supabase.co");

/** Reuse one pool per isolate (Vercel serverless / warm instances) to avoid connection storms */
const globalForPool = globalThis as typeof globalThis & { __byuconnectPg?: pg.Pool };
const pool =
  globalForPool.__byuconnectPg ??
  (globalForPool.__byuconnectPg = new Pool({
    connectionString: databaseUrl,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 15_000,
  }));

export { pool };
export const db = drizzle(pool, { schema });

export * from "./schema/index.js";
