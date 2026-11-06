/**
 * Removes the raw IP addresses already stored in user_reports, guide_downloads, pdf_downloads and chat_visitors.
 *
 *   npx tsx scripts/null-raw-ip.ts             dry run (default): counts only, inside a READ ONLY transaction, writes nothing
 *   npx tsx scripts/null-raw-ip.ts --confirm   writes
 *
 * DATABASE_URL points at production (CLAUDE.md), so --confirm is a production write: run it only after the founder has said so.
 *
 * What --confirm does, in one transaction:
 *   - user_reports.ip_address and guide_downloads.ip_address: set to NULL.
 *   - pdf_downloads.ip_address (NOT NULL in the table): set to '' (empty string).
 *   - chat_visitors: for rows without a fingerprint, first store the keyed hash of the address in `fingerprint` (lib/privacy/ip.ts, the same value the app now uses
 *     to recognise a browser, so visitors keep their free-message count and credit balance), then set ip_address to NULL.
 * The schema is not changed. chat_restore_requests.ip_address (rate limiting of credit-restore requests) and referral_consents.ip_hash are not touched.
 * It does not delete rows. Re-running it is safe: it only touches rows that still carry an address.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";

import { ipFingerprint } from "../lib/privacy/ip";

const CONFIRM = process.argv.includes("--confirm");
const prisma = new PrismaClient();

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

async function exists(tx: Tx, table: string): Promise<boolean> {
  const rows = await tx.$queryRawUnsafe<{ r: string | null }[]>(`SELECT to_regclass('public.${table}')::text AS r`);
  return Boolean(rows[0]?.r);
}
async function count(tx: Tx, sql: string): Promise<number> {
  const rows = await tx.$queryRawUnsafe<{ n: bigint }[]>(sql);
  return Number(rows[0]?.n ?? 0);
}

async function main() {
  console.log(CONFIRM ? "MODE: --confirm (WRITES to the database in DATABASE_URL)" : "MODE: dry run (nothing is written; pass --confirm to write)");
  await prisma.$transaction(
    async (tx) => {
      if (!CONFIRM) await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      const result: Record<string, unknown> = {};

      for (const [table, notEmpty] of [
        ["user_reports", "ip_address IS NOT NULL"],
        ["guide_downloads", "ip_address IS NOT NULL"],
        ["pdf_downloads", "ip_address IS NOT NULL AND ip_address <> ''"],
        ["chat_visitors", "ip_address IS NOT NULL"],
      ] as const) {
        if (!(await exists(tx, table))) {
          result[table] = "table does not exist";
          continue;
        }
        const before = await count(tx, `SELECT count(*) AS n FROM ${table} WHERE ${notEmpty}`);
        const entry: Record<string, unknown> = { rowsWithAddress: before };
        if (table === "chat_visitors") entry.rowsNeedingFingerprint = await count(tx, `SELECT count(*) AS n FROM chat_visitors WHERE ip_address IS NOT NULL AND fingerprint IS NULL`);
        if (CONFIRM && before > 0) {
          if (table === "chat_visitors") {
            const rows = await tx.$queryRawUnsafe<{ id: string; ip_address: string }[]>(`SELECT id, ip_address FROM chat_visitors WHERE ip_address IS NOT NULL AND fingerprint IS NULL`);
            for (const r of rows) await tx.$executeRawUnsafe(`UPDATE chat_visitors SET fingerprint = $1 WHERE id = $2 AND fingerprint IS NULL`, ipFingerprint(r.ip_address), r.id);
            entry.fingerprintsWritten = rows.length;
            entry.addressesRemoved = Number(await tx.$executeRawUnsafe(`UPDATE chat_visitors SET ip_address = NULL WHERE ip_address IS NOT NULL`));
          } else if (table === "pdf_downloads") {
            entry.addressesRemoved = Number(await tx.$executeRawUnsafe(`UPDATE pdf_downloads SET ip_address = '' WHERE ip_address IS NOT NULL AND ip_address <> ''`));
          } else {
            entry.addressesRemoved = Number(await tx.$executeRawUnsafe(`UPDATE ${table} SET ip_address = NULL WHERE ip_address IS NOT NULL`));
          }
          entry.rowsWithAddressAfter = await count(tx, `SELECT count(*) AS n FROM ${table} WHERE ${notEmpty}`);
        }
        result[table] = entry;
      }
      console.log(JSON.stringify(result, null, 2));
    },
    { timeout: 120_000 },
  );
  if (!CONFIRM) console.log("\nDry run only. Nothing was changed.");
}

main()
  .catch((e) => {
    console.error("FAILED:", String(e?.message ?? e).split("\n").filter(Boolean).slice(-3).join(" | "));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
