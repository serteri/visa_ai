/**
 * Deletes one person's data by email address (the "deletion" request in the privacy policy).
 *
 *   npx tsx scripts/delete-user-data.ts --email person@example.com             dry run (default): counts only, READ ONLY transaction
 *   npx tsx scripts/delete-user-data.ts --email person@example.com --confirm   deletes, in one transaction
 *
 * DATABASE_URL points at production (CLAUDE.md), so --confirm is a production delete. Run it only for a request the founder has verified (the request must
 * come from the email address itself).
 *
 * Deleted (matched on lower(email)): user_reports (their lead_notes go with them; transactions keep their row, the link is set to NULL), pdf_downloads,
 * guide_downloads, contact_messages, full_check_waitlist, leads, points_alerts, chat_credit_links, chat_restore_tokens, chat_restore_requests,
 * verification_tokens, the chat_visitor_profiles of the visitors linked to the email, and the users row when its role is USER (accounts, sessions, saved
 * calculations, quiz results, saved reports, visa tracking, journeys and document rows go with it).
 *
 * Kept, and reported: transactions and chat_credit_purchases (payment records), referral_consents (append-only by a database trigger; it holds no name or
 * email, only report and agent ids and a hashed IP address), chat_visitors rows (no email; they hold a browser fingerprint and the credit balance), and an
 * AGENT or ADMIN user (never deleted here). Files in the storage bucket are NOT deleted by this script: the keys are printed for manual deletion.
 *
 * Every run (dry or confirmed) is appended to logs/data-requests.jsonl (git-ignored): time, a short SHA-256 of the email (not the email), mode, operator,
 * counts. The log itself holds no personal data.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { userInfo } from "node:os";
import { join } from "node:path";

import { PrismaClient } from "@prisma/client";

const args = process.argv.slice(2);
const CONFIRM = args.includes("--confirm");
const emailIdx = args.indexOf("--email");
const EMAIL = (emailIdx >= 0 ? args[emailIdx + 1] : "")?.trim().toLowerCase() ?? "";

const prisma = new PrismaClient();
type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

async function tableExists(tx: Tx, table: string): Promise<boolean> {
  const rows = await tx.$queryRawUnsafe<{ r: string | null }[]>(`SELECT to_regclass('public.${table}')::text AS r`);
  return Boolean(rows[0]?.r);
}
const n = (v: unknown) => Number(v ?? 0);

/** Counts (dry run) or deletes (confirm) the rows of `table` matching `where` ($1 is the parameter). Returns the number of rows. */
async function act(tx: Tx, table: string, where: string, param: unknown): Promise<number | "table does not exist"> {
  if (!(await tableExists(tx, table))) return "table does not exist";
  if (!CONFIRM) {
    const rows = await tx.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM ${table} WHERE ${where}`, param);
    return n(rows[0]?.n);
  }
  return n(await tx.$executeRawUnsafe(`DELETE FROM ${table} WHERE ${where}`, param));
}
async function countOnly(tx: Tx, table: string, where: string, param: unknown): Promise<number | "table does not exist"> {
  if (!(await tableExists(tx, table))) return "table does not exist";
  const rows = await tx.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM ${table} WHERE ${where}`, param);
  return n(rows[0]?.n);
}

async function main() {
  if (!EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(EMAIL)) {
    console.error("Usage: npx tsx scripts/delete-user-data.ts --email person@example.com [--confirm]");
    process.exitCode = 2;
    return;
  }
  console.log(CONFIRM ? "MODE: --confirm (DELETES rows in the database in DATABASE_URL)" : "MODE: dry run (nothing is deleted; pass --confirm to delete)");

  const report: { deleted: Record<string, unknown>; kept: Record<string, unknown>; manual: Record<string, unknown> } = { deleted: {}, kept: {}, manual: {} };

  await prisma.$transaction(
    async (tx) => {
      if (!CONFIRM) await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      const e = "lower(email) = lower($1)";

      // Read first what the deletes would remove or leave behind.
      const reportIds = (await tableExists(tx, "user_reports")) ? (await tx.$queryRawUnsafe<{ id: string }[]>(`SELECT id FROM user_reports WHERE ${e}`, EMAIL)).map((r) => r.id) : [];
      report.kept.referral_consents =
        reportIds.length && (await tableExists(tx, "referral_consents"))
          ? n((await tx.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM referral_consents WHERE report_id = ANY($1::text[])`, reportIds))[0]?.n)
          : 0;
      report.kept.transactions = await countOnly(tx, "transactions", "lower(buyer_email) = lower($1)", EMAIL);
      report.kept.chat_credit_purchases = await countOnly(tx, "chat_credit_purchases", e, EMAIL);

      const linkedVisitors = (await tableExists(tx, "chat_credit_links"))
        ? (await tx.$queryRawUnsafe<{ visitor_id: string }[]>(`SELECT visitor_id FROM chat_credit_links WHERE ${e}`, EMAIL)).map((r) => r.visitor_id)
        : [];
      report.kept.chat_visitors_linked_to_the_email = linkedVisitors.length;

      const user = (await tx.$queryRawUnsafe<{ id: string; role: string }[]>(`SELECT id, role FROM users WHERE ${e}`, EMAIL))[0];
      if (user) {
        const keys = (await tableExists(tx, "visa_documents"))
          ? (
              await tx.$queryRawUnsafe<{ file_key: string | null }[]>(
                `SELECT d.file_key FROM visa_documents d JOIN visa_journeys j ON j.id = d.journey_id WHERE j.user_id = $1 AND d.file_key IS NOT NULL`,
                user.id,
              )
            ).map((r) => r.file_key)
          : [];
        report.manual.storage_bucket_keys_to_delete_by_hand = keys;
        if (user.role !== "USER") report.kept.users = `not deleted: role ${user.role} (agent and admin accounts are never deleted by this script)`;
      }

      // Deletes (or counts), children before parents where a foreign key needs it.
      for (const [table, where] of [
        ["pdf_downloads", e],
        ["guide_downloads", e],
        ["contact_messages", e],
        ["full_check_waitlist", e],
        ["leads", e],
        ["points_alerts", e],
        ["chat_restore_tokens", e],
        ["chat_restore_requests", e],
        ["verification_tokens", "lower(identifier) = lower($1)"],
      ] as const) {
        report.deleted[table] = await act(tx, table, where, EMAIL);
      }

      if (linkedVisitors.length && (await tableExists(tx, "chat_visitor_profiles"))) {
        report.deleted.chat_visitor_profiles = CONFIRM
          ? n(await tx.$executeRawUnsafe(`DELETE FROM chat_visitor_profiles WHERE visitor_id = ANY($1::text[])`, linkedVisitors))
          : n((await tx.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM chat_visitor_profiles WHERE visitor_id = ANY($1::text[])`, linkedVisitors))[0]?.n);
      } else {
        report.deleted.chat_visitor_profiles = 0;
      }
      report.deleted.chat_credit_links = await act(tx, "chat_credit_links", e, EMAIL);
      report.deleted.user_reports = await act(tx, "user_reports", e, EMAIL);
      report.deleted.users = user && user.role === "USER" ? await act(tx, "users", "id = $1", user.id) : 0;
    },
    { timeout: 120_000 },
  );

  console.log(JSON.stringify(report, null, 2));

  // The run is recorded without the email itself.
  mkdirSync("logs", { recursive: true });
  appendFileSync(
    join("logs", "data-requests.jsonl"),
    JSON.stringify({ at: new Date().toISOString(), emailSha256: createHash("sha256").update(EMAIL).digest("hex").slice(0, 16), mode: CONFIRM ? "confirm" : "dry-run", operator: userInfo().username, ...report }) + "\n",
  );
  console.log(`\nLogged to logs/data-requests.jsonl${CONFIRM ? "" : " (dry run: nothing was deleted)"}.`);
}

main()
  .catch((err) => {
    console.error("FAILED:", String(err?.message ?? err).split("\n").filter(Boolean).slice(-3).join(" | "));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
