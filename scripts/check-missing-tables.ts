/**
 * Lists every table the code needs that production does not have: the Prisma models and the Drizzle tables the code still writes
 * (leads, full_check_waitlist), taken from prisma/manual-migrations/2026-10-08-create-missing-tables.sql. full_check_usage is no longer used by any
 * code (the free-report quota was removed) and is not required.
 * READ ONLY: runs through PROD_DATABASE_URL in a READ ONLY transaction (scripts/lib/prod-db.ts). Writes nothing.
 *
 *   npx tsx scripts/check-missing-tables.ts
 */
import { readFileSync } from "node:fs";
import { withProdReadOnly } from "./lib/prod-db";

const sql = readFileSync("prisma/manual-migrations/2026-10-08-create-missing-tables.sql", "utf8");
const NO_LONGER_USED = new Set(["full_check_usage"]);
export const expectedTables = [...sql.matchAll(/CREATE TABLE IF NOT EXISTS "?([a-z_]+)"?/g)].map((m) => m[1]).filter((t) => !NO_LONGER_USED.has(t));

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
