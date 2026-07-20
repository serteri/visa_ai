import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { createUserReport } from "@/src/lib/user-reports";

/**
 * Local webhook test for app/api/stripe/webhook/route.ts, bypassing Stripe
 * CLI entirely (its stored test-mode key is expired -- `stripe trigger`
 * would fail before even reaching our code, and it can't inject custom
 * metadata anyway). Uses Stripe's own generateTestHeaderString() to produce
 * a genuinely valid signature for a hand-built checkout.session.completed
 * payload -- the route's real signature-verification path is exercised
 * as-is, nothing bypassed or mocked on the receiving end.
 *
 * Requires `npm run dev` already running on localhost:3000.
 *
 * Usage: npx tsx scripts/test-webhook.ts
 */

const WEBHOOK_URL = process.env.TEST_WEBHOOK_URL || "http://localhost:3000/api/stripe/webhook";
const AMOUNT_TOTAL_CENTS = 5000; // $50.00
const AGENT_ID = process.env.TEST_AGENT_ID; // real AGENT user id, e.g. agent-test@logivisa.com's id

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

  let agentId = AGENT_ID;
  if (!agentId) {
    const agent = await prisma.user.findFirst({ where: { role: "AGENT" }, select: { id: true, email: true } });
    if (!agent) throw new Error("No AGENT user found in DB -- set TEST_AGENT_ID or seed one first");
    agentId = agent.id;
    console.log("Using agent:", agent.email, agentId);
  }

  // A real lead row is required: the webhook handler looks it up by id to
  // mark it paid/unlocked and to build the PDF, not just to record the
  // Transaction.
  const lead = await createUserReport({
    fullName: "Webhook Test Customer",
    email: "webhook-test@example.com",
    source: "full_check",
    locale: "en",
    report: { assessmentState: {}, pathwayComparison: [] } as never,
    input: {} as never,
  });
  console.log("Created test lead:", lead.id);

  const sessionId = `cs_test_${Date.now()}`;
  const event = {
    id: `evt_test_${Date.now()}`,
    object: "event",
    api_version: "2024-06-20",
    created: Math.floor(Date.now() / 1000),
    type: "checkout.session.completed",
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
        amount_total: AMOUNT_TOTAL_CENTS,
        currency: "usd",
        customer_email: "webhook-test@example.com",
        customer_details: { email: "webhook-test@example.com", name: "Webhook Test Customer" },
        metadata: {
          reportId: lead.id,
          leadId: lead.id,
          agentId,
          email: "webhook-test@example.com",
        },
      },
    },
  };

  const payload = JSON.stringify(event);

  // Real Stripe SDK, real signing -- exercises the exact same verification
  // path stripe.webhooks.constructEvent() runs in production.
  const stripe = new Stripe(secretKey);
  const header = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });

  console.log("POSTing to", WEBHOOK_URL, "...");
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": header,
    },
    body: payload,
  });
  console.log("Response:", res.status, await res.text());

  if (res.status !== 200) {
    throw new Error(`Webhook did not return 200 (got ${res.status}) -- check the dev server logs`);
  }

  // ── Verify against the live DB ──────────────────────────────────────────
  const updatedLead = await prisma.userReport.findUnique({
    where: { id: lead.id },
    select: { paymentStatus: true, isUnlocked: true, unlockMethod: true },
  });
  console.log("Lead after webhook:", JSON.stringify(updatedLead));

  const tx = await prisma.transaction.findUnique({ where: { stripeSessionId: sessionId } });
  console.log("Transaction row:", JSON.stringify(tx));

  const expectedTotal = AMOUNT_TOTAL_CENTS / 100;
  const expectedCommission = Math.round(expectedTotal * 0.2 * 100) / 100;

  const failures: string[] = [];
  if (updatedLead?.paymentStatus !== "paid") failures.push(`paymentStatus expected "paid", got "${updatedLead?.paymentStatus}"`);
  if (!tx) failures.push("no Transaction row was created");
  if (tx && Number(tx.totalAmount) !== expectedTotal) failures.push(`totalAmount expected ${expectedTotal}, got ${tx.totalAmount}`);
  if (tx && Number(tx.commissionRate) !== 0.2) failures.push(`commissionRate expected 0.2, got ${tx.commissionRate}`);
  if (tx && Number(tx.commissionAmount) !== expectedCommission) {
    failures.push(`commissionAmount expected ${expectedCommission}, got ${tx.commissionAmount}`);
  }
  if (tx && tx.agentId !== agentId) failures.push(`agentId expected ${agentId}, got ${tx.agentId}`);

  // Cleanup regardless of outcome.
  await prisma.transaction.deleteMany({ where: { stripeSessionId: sessionId } });
  await prisma.userReport.delete({ where: { id: lead.id } });
  console.log("Cleaned up test rows.");

  if (failures.length > 0) {
    throw new Error("FAIL:\n - " + failures.join("\n - "));
  }
  console.log(
    `PASS: $${expectedTotal} sale -> lead marked paid -> $${expectedCommission} (20%) commission recorded for agent ${agentId}`
  );
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
