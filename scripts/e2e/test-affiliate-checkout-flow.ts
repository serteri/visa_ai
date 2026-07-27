/**
 * E2E-ish verification for the affiliate/Stripe commission flow, covering
 * everything that can be tested deterministically at the DB/function level
 * WITHOUT a real browser or a live Stripe session:
 *
 *   - Step 2 (metadata resolution): getAgentUser() resolves the cookie
 *     value the same way app/actions/stripeActions.ts's
 *     resolveReferralAgentId() does.
 *   - Step 4 (DB insertion without a dummy leadId): recordCommissionTransactionForLead()
 *     writes a Transaction row keyed by buyerEmail, no UserReport created.
 *   - Step 5 (race condition): two concurrent calls for the SAME
 *     stripeSessionId must produce exactly one Transaction row.
 *
 * What this script deliberately does NOT cover -- those need a real
 * browser + Stripe CLI, see docs/e2e/affiliate-checkout-flow.md for the
 * manual steps:
 *   - Step 1 (the logivisa_ref cookie itself -- components/ref-capture.tsx
 *     is a client component, `document.cookie` only exists in a browser)
 *   - Step 3 (an actual `checkout.session.completed` webhook delivery,
 *     signature verification included)
 *   - The true webhook-endpoint-level idempotency check (this script tests
 *     the underlying function directly; the manual guide tests the full
 *     HTTP route via `stripe events resend`)
 *
 * Usage: npx tsx scripts/e2e/test-affiliate-checkout-flow.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" }); // .env.local intentionally NOT loaded -- see ADR 0001 / prior session notes: it points DATABASE_URL at a different host that fails auth here.

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { getAgentUser } from "../../lib/crm/leads";
import { recordCommissionTransactionForLead, hasRecordedTransaction } from "../../lib/stripe/commission";

const prisma = new PrismaClient();
const TEST_AGENT_ID = "TEST_AGENT_123"; // matches the ?ref=TEST_AGENT_123 example in the task

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

async function main() {
  const suffix = Date.now();
  const buyerEmail = `e2e-affiliate-buyer-${suffix}@example.com`;
  const sessionId = `cs_test_e2e_affiliate_${suffix}`;

  // Setup: a real AGENT account with id = TEST_AGENT_ID, so getAgentUser()
  // (the exact function app/actions/stripeActions.ts calls to validate the
  // cookie value) resolves it as a legitimate agent, not an arbitrary
  // string. This is what "?ref=TEST_AGENT_123" being real, not spoofed,
  // looks like on the server side.
  await prisma.user.deleteMany({ where: { id: TEST_AGENT_ID } });
  await prisma.user.create({
    data: {
      id: TEST_AGENT_ID,
      name: "E2E Test Agent",
      email: `e2e-test-agent-${suffix}@example.com`,
      password: await bcrypt.hash("TestPassword123!", 12),
      role: "AGENT",
      approvalStatus: "APPROVED",
      commissionRate: 20,
    },
  });

  try {
    // ── Step 2: cookie value -> real agent resolution ──────────────────────
    // This is the exact call app/actions/stripeActions.ts's
    // resolveReferralAgentId() makes with the logivisa_ref cookie's value.
    const resolvedAgent = await getAgentUser(TEST_AGENT_ID);
    assert(resolvedAgent?.id === TEST_AGENT_ID, "getAgentUser resolves the cookie value to the real agent (this is what lands in Stripe metadata.agentId)");

    const spoofedAgent = await getAgentUser("not-a-real-agent-id");
    assert(spoofedAgent === null, "getAgentUser returns null for a made-up/spoofed ref value (no commission attributed to a fake agent)");

    // ── Step 4: webhook's DB write, simulated with the real resolved values ─
    // This mirrors exactly what app/api/stripe/webhook/route.ts's campaign
    // branch does after handlePdfBookPurchase succeeds: buyerEmail from
    // Stripe's session.customer_details.email, agentId from metadata (now
    // proven real above), NO UserReport/leadId involved.
    const userReportCountBefore = await prisma.userReport.count();

    await recordCommissionTransactionForLead({
      buyerEmail,
      agentId: resolvedAgent!.id,
      stripeSessionId: sessionId,
      totalAmount: 9.99,
    });

    const tx = await prisma.transaction.findUnique({ where: { stripeSessionId: sessionId } });
    assert(tx !== null, "Transaction row created for the referred sale");
    assert(tx?.leadId === null, "Transaction.leadId is null -- no dummy lead created");
    assert(tx?.buyerEmail === buyerEmail, "Transaction.buyerEmail holds the real Stripe-collected email");
    assert(tx?.agentId === TEST_AGENT_ID, "Transaction.agentId is the referring agent");
    assert(tx?.commissionAmount != null && Math.abs(Number(tx?.commissionAmount) - 2.0) < 1e-9, `commissionAmount is 20% of $9.99 = $2.00 (got ${tx?.commissionAmount})`);

    const userReportCountAfter = await prisma.userReport.count();
    assert(userReportCountAfter === userReportCountBefore, "no UserReport row was created as a side effect (CRM metrics not polluted)");

    // ── Step 5: race condition -- two concurrent deliveries of the SAME event ─
    // Simulates Stripe redelivering (or double-firing) checkout.session.completed
    // for the same session. hasRecordedTransaction() is what the real webhook
    // checks BEFORE sending the PDF; here we additionally prove the ledger
    // write itself can't double-insert even if both requests raced past that
    // check (the unique constraint on stripeSessionId is the last line of
    // defense -- see recordCommissionTransactionForLead's doc comment).
    const raceSessionId = `cs_test_e2e_race_${suffix}`;
    const preRace = await hasRecordedTransaction(raceSessionId);
    assert(preRace === false, "hasRecordedTransaction is false before either 'delivery' runs");

    const results = await Promise.allSettled([
      recordCommissionTransactionForLead({ buyerEmail, agentId: TEST_AGENT_ID, stripeSessionId: raceSessionId, totalAmount: 9.99 }),
      recordCommissionTransactionForLead({ buyerEmail, agentId: TEST_AGENT_ID, stripeSessionId: raceSessionId, totalAmount: 9.99 }),
    ]);
    // Both calls should resolve without throwing -- the second one hits the
    // unique-constraint catch internally and logs+returns rather than
    // crashing the (hypothetical) second webhook request.
    assert(results.every((r) => r.status === "fulfilled"), "both concurrent writes resolve without throwing (unique-constraint race handled gracefully)");

    const raceCount = await prisma.transaction.count({ where: { stripeSessionId: raceSessionId } });
    assert(raceCount === 1, `exactly one Transaction row exists after two concurrent deliveries of the same session (got ${raceCount})`);

    const postRace = await hasRecordedTransaction(raceSessionId);
    assert(postRace === true, "hasRecordedTransaction is true after the race -- a real 3rd delivery would be skipped before any PDF send");

    console.log("\nAll checks complete.");
  } finally {
    await prisma.transaction.deleteMany({ where: { stripeSessionId: { in: [sessionId, `cs_test_e2e_race_${suffix}`] } } });
    await prisma.user.deleteMany({ where: { id: TEST_AGENT_ID } });
    console.log("Test data cleaned up.");
  }
}

main()
  .catch((e) => {
    console.error("ERROR", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
