/**
 * READ-ONLY audit: unlocked user_reports that have no Stripe payment behind them (no row in `transactions`, which the
 * Stripe webhook writes with the Checkout session id) and whose email is NOT on the admin / known-test allow-lists
 * (ADMIN_EMAILS, KNOWN_TEST_EMAILS). Prints counts and dates only -- never an email, name or report id.
 *
 * Usage: npx tsx scripts/audit-unlocked-reports.ts   (reads DATABASE_URL, ADMIN_EMAILS, KNOWN_TEST_EMAILS from .env)
 */
import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const list = (raw: string | undefined) =>
  (raw ?? "").split(",").map((s) => s.trim().replace(/^["']+|["']+$/g, "").trim().toLowerCase()).filter(Boolean);

async function main() {
  const allow = new Set([...list(process.env.ADMIN_EMAILS), ...list(process.env.KNOWN_TEST_EMAILS)]);
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{ email: string; ip_address: string | null; unlock_method: string | null; payment_status: string; is_free_promo: boolean; unlocked_at: Date | null; created_at: Date; has_tx: boolean }>
    >(`
      SELECT r.email, r.ip_address, r.unlock_method, r.payment_status, r.is_free_promo, r.unlocked_at, r.created_at,
             EXISTS (SELECT 1 FROM transactions t WHERE t.lead_id = r.id) AS has_tx
      FROM user_reports r
      WHERE r.is_unlocked = true
    `);
    const total = rows.length;
    const withoutStripe = rows.filter((r) => !r.has_tx);
    const suspect = withoutStripe.filter((r) => !allow.has(r.email.trim().toLowerCase()));

    const group = (xs: typeof rows, key: (r: (typeof rows)[number]) => string) =>
      Object.entries(xs.reduce<Record<string, number>>((acc, r) => ((acc[key(r)] = (acc[key(r)] ?? 0) + 1), acc), {})).sort();
    const month = (d: Date | null) => (d ? d.toISOString().slice(0, 7) : "unknown");
    const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "unknown");

    console.log(`allow-list sizes (from this environment): ADMIN_EMAILS ${list(process.env.ADMIN_EMAILS).length}, KNOWN_TEST_EMAILS ${list(process.env.KNOWN_TEST_EMAILS).length}`);
    console.log(`unlocked reports: ${total}`);
    console.log(`  with a Stripe transaction: ${total - withoutStripe.length}`);
    console.log(`  without a Stripe transaction: ${withoutStripe.length} (of which on the admin/test allow-lists: ${withoutStripe.length - suspect.length})`);
    console.log(`\nunlocked WITHOUT Stripe and NOT an allow-listed email: ${suspect.length}`);
    console.log("  by unlock_method / payment_status / is_free_promo:");
    for (const [k, n] of group(suspect, (r) => `${r.unlock_method ?? "null"} / ${r.payment_status} / free_promo=${r.is_free_promo}`)) console.log(`    ${k}: ${n}`);
    console.log("  by month unlocked:");
    for (const [k, n] of group(suspect, (r) => month(r.unlocked_at))) console.log(`    ${k}: ${n}`);
    if (suspect.length) {
      const dates = suspect.map((r) => r.unlocked_at ?? r.created_at).sort((a, b) => a.getTime() - b.getTime());
      console.log(`  first: ${day(dates[0])}, last: ${day(dates[dates.length - 1])}`);
      console.log("  by day unlocked (beta_free = the admin fast path):");
      for (const [k, n] of group(suspect.filter((r) => r.unlock_method === "beta_free"), (r) => day(r.unlocked_at))) console.log(`    ${k}: ${n}`);
    }

    // The admin fast path OVERWROTE user_reports.email with the typed address (markUserReportUnlocked), so an abused
    // report would now carry an allow-listed email and pass the check above. The submitter's IP (recorded at
    // submission, never overwritten) is the remaining signal: allow-listed no-Stripe unlocks whose IP no other
    // allow-listed report ever used are the ones to look at. IPs are compared here, never printed.
    const allowed = withoutStripe.filter((r) => allow.has(r.email.trim().toLowerCase()));
    const ipCount = new Map<string, number>();
    for (const r of rows.filter((x) => allow.has(x.email.trim().toLowerCase()))) if (r.ip_address) ipCount.set(r.ip_address, (ipCount.get(r.ip_address) ?? 0) + 1);
    const lone = allowed.filter((r) => !r.ip_address || (ipCount.get(r.ip_address) ?? 0) < 2);
    console.log(`\nallow-listed no-Stripe unlocks: ${allowed.length}, from ${new Set(allowed.map((r) => r.ip_address)).size} distinct submission IPs`);
    console.log(`  on an IP shared with other allow-listed reports: ${allowed.length - lone.length}`);
    console.log(`  on an IP no other allow-listed report used (or no IP): ${lone.length}`);
    for (const [k, n] of group(lone, (r) => `${day(r.unlocked_at)} ${r.unlock_method ?? "null"}`)) console.log(`    ${k}: ${n}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("audit failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
