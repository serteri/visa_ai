/**
 * Read-only: free-beta report unlocks per day (counts only -- no names, no emails, no report ids).
 *
 *   npx tsx scripts/report-free-beta-unlocks.ts [days]      default 30
 *
 * Reads production through PROD_DATABASE_URL in a READ ONLY transaction (scripts/lib/prod-db.ts; see
 * docs/database-environments.md). The record is user_reports itself: an unlock with unlock_method = 'beta_free' sets
 * unlocked_at (src/lib/user-reports.ts markUserReportUnlocked).
 */
import "dotenv/config";

import { withProdReadOnly } from "./lib/prod-db";

async function main() {
  const days = Math.max(1, Math.min(365, Number(process.argv[2]) || 30));
  const rows = await withProdReadOnly((tx) =>
    tx.$queryRawUnsafe<Array<{ day: string; n: number }>>(
      `SELECT to_char(date_trunc('day', unlocked_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
       FROM user_reports
       WHERE unlock_method = 'beta_free' AND unlocked_at >= NOW() - ($1::int * INTERVAL '1 day')
       GROUP BY 1 ORDER BY 1 DESC`,
      days,
    ),
  );
  console.log(`Free-beta unlocks per day, last ${days} days (UTC):`);
  for (const r of rows) console.log(`  ${r.day}  ${r.n}`);
  console.log(`Total: ${rows.reduce((n, r) => n + r.n, 0)}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
