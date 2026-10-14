/**
 * The one-time seed of the admin "State nomination" data (docs/admin-data-design.md D.2).
 *
 *   npx dotenv-cli -e .env.local -- tsx scripts/seed-admin-data.ts
 *       DRY RUN (default): prints exactly what would be written, per state, and nothing else. It also tries to list the existing
 *       state_nomination_configs rows through PROD_DATABASE_URL (a READ ONLY transaction); if that cannot connect it says so and goes on.
 *   npx tsx scripts/seed-admin-data.ts --write-doc
 *       writes the dry run to docs/admin-data-seed-dry-run.md (no database at all).
 *   npx dotenv-cli -e .env.local -- tsx scripts/seed-admin-data.ts --execute --expect-rows 8
 *       REAL WRITE to the production database (DATABASE_URL): inserts the states that have no row yet, in one transaction, with their audit
 *       entries. Never updates or deletes a row; running it twice inserts nothing the second time. N must equal the row count the dry run showed.
 *       Needs prisma/manual-migrations/2026-10-15-create-admin-state-data.sql to have been run.
 */
import { writeFileSync } from "node:fs";

import { renderDryRun, type LegacyAdminRow } from "../lib/admin-data/dry-run";
import { buildSeedPrograms } from "../lib/admin-data/seed";
import { seedStatePrograms } from "../lib/admin-data/service";

async function readLegacyRows(): Promise<{ rows: LegacyAdminRow[] | null; error: string | null }> {
  if (!process.env.PROD_DATABASE_URL) return { rows: null, error: "PROD_DATABASE_URL is not set" };
  try {
    const { withProdReadOnly } = await import("./lib/prod-db");
    const rows = await withProdReadOnly((tx) => tx.stateNominationConfig.findMany());
    return {
      rows: rows.map((r) => ({ stateCode: r.stateCode, status: r.status, feeAud: r.feeAud, customAiNote: r.customAiNote, officialWebsite: r.officialWebsite, updatedAt: r.updatedAt.toISOString() })),
      error: null,
    };
  } catch (e) {
    return { rows: null, error: e instanceof Error ? e.message.split("\n").pop()?.slice(0, 160) ?? "read failed" : "read failed" };
  }
}

async function readExistingCodes(): Promise<string[]> {
  if (!process.env.PROD_DATABASE_URL) return [];
  try {
    const { withProdReadOnly } = await import("./lib/prod-db");
    const rows = await withProdReadOnly((tx) => tx.stateProgram.findMany({ select: { stateCode: true } }));
    return rows.map((r) => r.stateCode);
  } catch {
    return []; // the table may not exist yet
  }
}

async function main() {
  const args = process.argv.slice(2);
  const programs = Object.values(buildSeedPrograms());

  if (args.includes("--write-doc")) {
    writeFileSync("docs/admin-data-seed-dry-run.md", renderDryRun(programs, { legacy: null, legacyError: "run `npx dotenv-cli -e .env.local -- tsx scripts/seed-admin-data.ts` to list them" }));
    console.log(`wrote docs/admin-data-seed-dry-run.md (${programs.length} states)`);
    return;
  }

  if (!args.includes("--execute")) {
    const [legacy, existing] = await Promise.all([readLegacyRows(), readExistingCodes()]);
    console.log(renderDryRun(programs, { existing, legacy: legacy.rows, legacyError: legacy.error }));
    const toInsert = programs.filter((p) => !existing.includes(p.stateCode)).length;
    console.log(`Nothing was written. To write ${toInsert} row(s):\n  npx dotenv-cli -e .env.local -- tsx scripts/seed-admin-data.ts --execute --expect-rows ${toInsert}`);
    return;
  }

  const expectIdx = args.indexOf("--expect-rows");
  const expected = expectIdx >= 0 ? Number(args[expectIdx + 1]) : NaN;
  const existing = await readExistingCodes();
  const toInsert = programs.filter((p) => !existing.includes(p.stateCode)).length;
  if (!Number.isInteger(expected) || expected !== toInsert) throw new Error(`--expect-rows must equal ${toInsert} (the rows the dry run listed); got ${Number.isNaN(expected) ? "nothing" : expected}.`);
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");

  const { prismaStateProgramStore } = await import("../lib/admin-data/store-prisma");
  const result = await seedStatePrograms(prismaStateProgramStore, { id: null, email: null, label: "seed script (scripts/seed-admin-data.ts)" });
  console.log(`inserted: ${result.inserted.join(", ") || "none"}; skipped (already had a row): ${result.skipped.join(", ") || "none"}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      const { prisma } = await import("../lib/prisma");
      await prisma.$disconnect();
    } catch {
      /* nothing to disconnect */
    }
  });
