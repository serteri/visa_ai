import { prisma } from "@/lib/prisma";
import { runReadinessEngine } from "@/src/lib/readiness-engine";
import { computeInternalLeadTier } from "@/lib/readiness/internal-lead-tier";
import type { ReadinessInput, ReadinessReport } from "@/lib/readiness/types";

/**
 * One-off backfill for the pathway-coverage-audit branch's engine fixes
 * (485 detection/age-exception, 820/801 leak, gate-based ranking for
 * 500/482/186). Recomputes report_json/points_tier from each row's own
 * unchanged input_json and overwrites them.
 *
 * Reversible: old report_json/points_tier are copied into
 * report_json_backup/points_tier_backup columns (added here, IF NOT
 * EXISTS) before being overwritten. To roll back, see
 * scripts/rollback-report-json-2026-07.ts.
 *
 * Idempotent: a row already carrying a non-null report_json_backup is
 * skipped, so re-running this script never overwrites a real original
 * with an already-migrated value.
 *
 * Scope: exactly the 8 real test-agent leads verified via the dry-run
 * diff (scratch/backfill/dry-run-diff.ts) against a manual Neon Console
 * export in July 2026. Record 9 in that export (occupation
 * "Xyzblorpnonsensejob") is synthetic test data and is deliberately not
 * in this list.
 */
const TARGET_LEAD_IDS = [
  "e8dce9b4-9f53-4052-8698-1bb04f2a191e",
  "3c353056-64d3-41fe-8aa3-c6594b635632",
  "b4559fc0-8401-4702-b452-a875077f30ee",
  "837b197a-ce20-4e4b-91ee-71c428236157",
  "68193c05-3e98-44e6-8c21-cbc3ec7d393a",
  "944d0bf2-24c1-43cd-b216-13d6d29b24a0",
  "e7e48f80-9a16-4a36-b5d9-f11efface9a6",
  "a778f520-26c3-4f30-825f-80e71a7a7cd8",
];

type Row = {
  id: string;
  report_json: ReadinessReport;
  input_json: ReadinessInput;
  points_tier: string | null;
  report_json_backup: ReadinessReport | null;
};

async function main() {
  let updated = 0;
  let skippedAlreadyBackedUp = 0;
  let errors = 0;

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`
        ALTER TABLE user_reports
          ADD COLUMN IF NOT EXISTS report_json_backup JSONB,
          ADD COLUMN IF NOT EXISTS points_tier_backup TEXT
      `);

      for (const id of TARGET_LEAD_IDS) {
        const rows = await tx.$queryRawUnsafe<Row[]>(
          `SELECT id, report_json, input_json, points_tier, report_json_backup
           FROM user_reports WHERE id::text = $1::text LIMIT 1`,
          id
        );
        const row = rows[0];
        if (!row) {
          console.error(`[backfill] SKIP ${id}: not found`);
          errors++;
          continue;
        }
        if (row.report_json_backup !== null) {
          console.log(`[backfill] SKIP ${id}: already backed up (already migrated)`);
          skippedAlreadyBackedUp++;
          continue;
        }

        const newReport = runReadinessEngine(row.input_json);
        const newTier = computeInternalLeadTier(row.input_json, newReport.assessmentState);

        await tx.$executeRawUnsafe(
          `UPDATE user_reports
           SET report_json_backup = report_json,
               points_tier_backup = points_tier,
               report_json = $2::jsonb,
               points_tier = $3
           WHERE id::text = $1::text`,
          id,
          JSON.stringify(newReport),
          newTier
        );

        console.log(`[backfill] UPDATED ${id}: points_tier ${row.points_tier ?? "(none)"} -> ${newTier}`);
        updated++;
      }
    },
    { timeout: 30_000 }
  );

  console.log(`\n[backfill] Done. updated=${updated} skipped(already-backed-up)=${skippedAlreadyBackedUp} errors=${errors}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[backfill] Transaction rolled back:", err);
  await prisma.$disconnect();
  process.exit(1);
});
