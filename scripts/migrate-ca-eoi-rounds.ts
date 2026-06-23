/**
 * Migration: Create ca_eoi_rounds table
 *
 * Run with: npx ts-node -e "require('./scripts/migrate-ca-eoi-rounds.ts')"
 * Or via: npx tsx scripts/migrate-ca-eoi-rounds.ts
 */

import { prisma } from "@/lib/prisma";

async function main() {
  console.log("[Migration] Creating ca_eoi_rounds table via Prisma...");

  // Use raw SQL to create the table if it doesn't exist yet,
  // so this script is safe to run multiple times (idempotent).
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ca_eoi_rounds (
      id          TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      draw_number INTEGER     NOT NULL,
      round_date  TIMESTAMPTZ NOT NULL,
      draw_name   TEXT        NOT NULL,
      crs_score   INTEGER     NOT NULL,
      invitations INTEGER     NOT NULL,
      source      TEXT        NOT NULL DEFAULT 'scraper',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT ca_eoi_rounds_draw_number_key UNIQUE (draw_number)
    );
  `);

  console.log("[Migration] ca_eoi_rounds table is ready.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[Migration] Error:", err);
  process.exit(1);
});
