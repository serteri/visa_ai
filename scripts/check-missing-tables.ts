/**
 * Lists every table the code expects (prisma/manual-migrations/2026-10-08-create-missing-tables.sql) that production does not have.
 * READ ONLY: runs through PROD_DATABASE_URL in a READ ONLY transaction (scripts/lib/prod-db.ts). Writes nothing.
 *
 *   npx tsx scripts/check-missing-tables.ts
 */
import { readFileSync } from "node:fs";
import { withProdReadOnly } from "./lib/prod-db";

const sql = readFileSync("prisma/manual-migrations/2026-10-08-create-missing-tables.sql", "utf8");
export const expectedTables = [...sql.matchAll(/CREATE TABLE IF NOT EXISTS "?([a-z_]+)"?/g)].map((m) => m[1]);

async function main() {
  const live = await withProdReadOnly(async (tx) => {
    const rows = await tx.$queryRawUnsafe<{ table_name: string }[]>("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    return new Set(rows.map((r) => r.table_name));
  });
  const missing = expectedTables.filter((t) => !live.has(t));
  console.log(`expected ${expectedTables.length} tables, production has ${expectedTables.length - missing.length}`);
  console.log(missing.length ? `MISSING:\n  ${missing.join("\n  ")}` : "nothing missing");
}

if (require.main === module) main().catch((e) => { console.error(e); process.exitCode = 1; });
