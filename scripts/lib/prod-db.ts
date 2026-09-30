/**
 * Read-only access to the PRODUCTION database for scripts (see docs/database-environments.md).
 *
 * DATABASE_URL is the Neon dev branch locally (.env / .env.local) and on Vercel Preview; only Vercel Production points
 * at main. A script that must read real production rows (a stored report, the live state config, the unlock audit)
 * uses PROD_DATABASE_URL instead -- never DATABASE_URL -- and every query runs inside a transaction opened with
 * SET TRANSACTION READ ONLY, so Postgres itself rejects any write.
 */
import type { Prisma, PrismaClient } from "@prisma/client";

export const PROD_DB_ENV = "PROD_DATABASE_URL";

/** PROD_DATABASE_URL, or undefined when it is not set (never falls back to DATABASE_URL). */
export function prodDatabaseUrl(): string | undefined {
  const url = process.env[PROD_DB_ENV]?.trim();
  return url ? url : undefined;
}

export function requireProdDatabaseUrl(): string {
  const url = prodDatabaseUrl();
  if (!url) {
    throw new Error(`${PROD_DB_ENV} is not set. Production reads never use DATABASE_URL (the dev branch) -- see docs/database-environments.md.`);
  }
  return url;
}

/**
 * Runs `fn` against production in one READ ONLY transaction and disconnects. Throws when PROD_DATABASE_URL is not set.
 * The transaction is opened read-only before `fn` runs, so any INSERT / UPDATE / DELETE inside it fails.
 */
export async function withProdReadOnly<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>, opts: { timeoutMs?: number } = {}): Promise<T> {
  const url = requireProdDatabaseUrl();
  const { PrismaClient } = await import("@prisma/client");
  const db: PrismaClient = new PrismaClient({ datasources: { db: { url } } });
  try {
    return await db.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
        return fn(tx);
      },
      { timeout: opts.timeoutMs ?? 60_000 }
    );
  } finally {
    await db.$disconnect();
  }
}
