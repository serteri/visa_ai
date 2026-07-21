import { prisma } from "@/lib/prisma";

/**
 * Reverts scripts/backfill-report-json-2026-07.ts: restores report_json/
 * points_tier from the *_backup columns it wrote, for the same lead IDs.
 * A row with a null report_json_backup (never backfilled, or already
 * rolled back) is left untouched.
 *
 * Does not drop the backup columns -- safe to run this, inspect, and only
 * drop report_json_backup/points_tier_backup manually afterwards once
 * satisfied.
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

async function main() {
  const result = await prisma.$executeRawUnsafe(
    `UPDATE user_reports
     SET report_json = report_json_backup,
         points_tier = points_tier_backup,
         report_json_backup = NULL,
         points_tier_backup = NULL
     WHERE id::text = ANY($1::text[])
       AND report_json_backup IS NOT NULL`,
    TARGET_LEAD_IDS
  );

  console.log(`[rollback] Restored ${result} row(s) from backup.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[rollback] Failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
