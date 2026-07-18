import "dotenv/config";

import { sql } from "drizzle-orm";

import { db } from "@/db";

async function main() {
  const maxFree = Number.parseInt(process.env.MAX_FREE_REPORTS ?? "50", 10);

  let usageRow:
    | {
        id: number;
        free_reports_used: number | null;
        free_limit: number | null;
        is_free_active: boolean | null;
        updated_at: Date | string | null;
      }
    | undefined;
  let usageError: string | null = null;

  try {
    const usage = await db.execute(sql`
      SELECT id, free_reports_used, free_limit, is_free_active, updated_at
      FROM full_check_usage
      WHERE id = 1
    `);
    usageRow = usage.rows?.[0] as typeof usageRow;
  } catch (error) {
    usageError = error instanceof Error ? error.message : String(error);
  }

  async function safeCount(tableName: string): Promise<number | null> {
    try {
      const result = await db.execute(sql.raw(`SELECT COUNT(*)::int AS total FROM ${tableName}`));
      return (result.rows?.[0] as { total?: number } | undefined)?.total ?? null;
    } catch {
      return null;
    }
  }

  const [leadCount, waitlistCount, userReportCount] = await Promise.all([
    safeCount("leads"),
    safeCount("full_check_waitlist"),
    safeCount("user_reports"),
  ]);

  const used = Number(usageRow?.free_reports_used ?? 0);

  console.log(
    JSON.stringify(
      {
        maxFree,
        usage: usageRow ?? null,
        usageError,
        leadCount,
        waitlistCount,
        userReportCount,
        computedRemainingFromEnv: usageRow ? Math.max(0, maxFree - used) : null,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
