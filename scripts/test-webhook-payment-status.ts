/**
 * Stripe webhook payment-status gate for the two grants (app/api/stripe/webhook/route.ts):
 * chat credits (metadata.visitorId) and the report unlock (metadata.assessmentId / reportId).
 *
 * Runs the REAL webhook handler. Stubbed edges only: Stripe's sessions.retrieve / promotionCodes.retrieve
 * (fixtures, fake keys), Resend (recorder), Prisma (in memory), and the network (any attempt throws).
 *
 * For each grant:
 *   paid                                    checkout.session.completed            -> granted once
 *   no_payment_required (100% code, A$0)    checkout.session.completed            -> granted once
 *   unpaid, then async succeeded            completed: nothing; async_payment_succeeded -> granted once
 *   unpaid, then async failed               completed: nothing; async_payment_failed    -> never granted
 * Plus: a repeated delivery of the granting event adds no second chat credit (the purchase ledger, unchanged).
 *
 *   npx tsx scripts/test-webhook-payment-status.ts
 */
process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects: Prisma is stubbed
process.env.RESEND_API_KEY = "re_test_stub_not_a_real_key";
process.env.STRIPE_SECRET_KEY = "sk_test_stub_not_a_real_key";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_stub";
process.env.FROM_EMAIL = "LogiVisa Test <noreply@example.test>";
process.env.FULL_CHECK_NOTIFICATION_EMAIL = "internal-notify@example.test";
process.env.NEXT_PUBLIC_BASE_URL = "https://example.test";
process.env.ADMIN_EMAILS = "admin@example.test";
process.env.KNOWN_TEST_EMAILS = "";
delete process.env.SIMULATE_EMAIL_DELIVERY;
delete process.env.ENABLE_TRANSACTIONAL_EMAILS;

export {};
let failures = 0;
function check(cond: boolean, msg: string) {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}`);
  }
}

const CUSTOMER = "customer@example.test";

async function main() {
  // ── no network ──
  globalThis.fetch = (async () => {
    throw new Error("network access is forbidden in this test");
  }) as typeof fetch;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  for (const mod of [require("node:https"), require("node:http")] as Array<{ request: unknown }>) {
    mod.request = () => {
      throw new Error("network access is forbidden in this test");
    };
  }

  // ── Resend recorder ──
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resend } = require("resend") as typeof import("resend");
  (Object.getPrototypeOf(new Resend("re_stub").emails) as { send: unknown }).send = async () => ({ data: { id: "stub" }, error: null });

  // ── Stripe fixtures ──
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = (require("stripe") as { default?: typeof import("stripe").default }).default ?? (require("stripe") as typeof import("stripe").default);
  const probe = new Stripe("sk_test_stub");
  const fixtures = new Map<string, unknown>();
  (Object.getPrototypeOf(probe.checkout.sessions) as { retrieve: unknown }).retrieve = async (id: string) => fixtures.get(id);
  (Object.getPrototypeOf(probe.promotionCodes) as { retrieve: unknown }).retrieve = async (id: string) => ({ id, code: "PROMO100" });

  // ── Prisma (in memory) ──
  const visitor = { id: "visitor-1", ipAddress: "127.0.0.1", userAgent: "test", messageCount: 5, isPremium: false, premiumCredits: 0 };
  const purchases = new Set<string>();
  const unlocks: string[] = [];
  const db: Record<string, unknown> = {
    chatVisitor: {
      findFirst: async () => visitor,
      findUnique: async () => visitor,
      update: async (args: { data: { premiumCredits?: { increment?: number } } }) => {
        visitor.premiumCredits += args.data.premiumCredits?.increment ?? 0;
        return visitor;
      },
    },
    chatCreditPurchase: {
      findUnique: async (args: { where: { stripeSessionId: string } }) => (purchases.has(args.where.stripeSessionId) ? { id: "p" } : null),
      create: async (args: { data: { stripeSessionId: string } }) => {
        purchases.add(args.data.stripeSessionId);
        return { id: "p" };
      },
    },
    chatCreditLink: { upsert: async () => ({}) },
    userReport: {
      findUnique: async () => ({ id: "rep-1", email: CUSTOMER, locale: "en", fullName: "Test Person", source: "full_check", preferredPath: "189", reportJson: {}, inputJson: {} }),
      update: async (args: { where: { id: string }; data: { isUnlocked?: boolean } }) => {
        if (args.data.isUnlocked === true) unlocks.push(args.where.id);
        return {};
      },
    },
    transaction: { findUnique: async () => null, create: async () => ({}) },
    user: { findUnique: async () => null },
    $queryRawUnsafe: async () => [{ id: "rep-1", email: CUSTOMER, locale: "en", report_json: {}, input_json: {}, agent_id: null, is_unlocked: true, full_name: "Test Person", preview_data: null }],
    $executeRawUnsafe: async () => 0,
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(db),
    $disconnect: async () => undefined,
  };
  (globalThis as { prisma?: unknown }).prisma = db;

  const { NextRequest } = await import("next/server");
  const { POST } = await import("../app/api/stripe/webhook/route");

  type Kind = "credits" | "report";
  const sessionFor = (kind: Kind, id: string, paymentStatus: "paid" | "no_payment_required" | "unpaid", amountTotal: number) => {
    const s = {
      id,
      object: "checkout.session",
      mode: "payment",
      status: "complete",
      payment_status: paymentStatus,
      amount_total: amountTotal,
      amount_subtotal: kind === "credits" ? 1099 : 2199,
      currency: "aud",
      customer_email: CUSTOMER,
      customer_details: { email: CUSTOMER, name: "Test Person" },
      total_details: { amount_tax: 0, amount_discount: (kind === "credits" ? 1099 : 2199) - amountTotal, breakdown: { discounts: [], taxes: [] } },
      discounts: [],
      metadata:
        kind === "credits"
          ? { visitorId: visitor.id, userId: "", email: CUSTOMER, plan: "starter", credits: "50" }
          : { productType: "premium", email: CUSTOMER, assessmentId: "rep-1", reportId: "rep-1", leadId: "rep-1", agentId: "" },
    };
    fixtures.set(id, s);
    return s;
  };
  const deliver = async (type: string, session: unknown) => {
    const payload = JSON.stringify({ id: `evt_${type}_${Math.random().toString(36).slice(2)}`, object: "event", type, data: { object: session } });
    const header = probe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
    return POST(new NextRequest("http://localhost/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": header } }));
  };
  /** Credits added / unlocks made by `run`. */
  const measure = async (kind: Kind, run: () => Promise<void>) => {
    const c0 = visitor.premiumCredits;
    const u0 = unlocks.length;
    await run();
    return kind === "credits" ? visitor.premiumCredits - c0 : unlocks.length - u0;
  };
  const GRANT: Record<Kind, number> = { credits: 50, report: 1 };
  const what = (kind: Kind, n: number) => (kind === "credits" ? `${n} credits` : `${n} unlock(s)`);

  for (const kind of ["credits", "report"] as const) {
    console.log(`\n==================== ${kind === "credits" ? "chat credits (Starter, 50)" : "report unlock"} ====================`);

    // 1. paid
    {
      const s = sessionFor(kind, `cs_${kind}_paid`, "paid", kind === "credits" ? 1099 : 2199);
      let status = 0;
      const n = await measure(kind, async () => {
        status = (await deliver("checkout.session.completed", s)).status;
      });
      check(status === 200 && n === GRANT[kind], `paid: completed grants ${what(kind, n)} (HTTP ${status})`);
      if (kind === "credits") {
        const again = await measure(kind, async () => void (await deliver("checkout.session.completed", s)));
        check(again === 0, "paid: a repeated completed delivery adds nothing (idempotency unchanged)");
      }
    }

    // 2. no_payment_required (100% promotion code, A$0)
    {
      const s = sessionFor(kind, `cs_${kind}_free`, "no_payment_required", 0);
      let status = 0;
      const n = await measure(kind, async () => {
        status = (await deliver("checkout.session.completed", s)).status;
      });
      check(status === 200 && n === GRANT[kind], `no_payment_required (A$0): completed grants ${what(kind, n)} (HTTP ${status})`);
    }

    // 3. unpaid, then the async payment succeeds
    {
      const id = `cs_${kind}_async_ok`;
      const unpaid = sessionFor(kind, id, "unpaid", kind === "credits" ? 1099 : 2199);
      let s1 = 0;
      const atCompleted = await measure(kind, async () => {
        s1 = (await deliver("checkout.session.completed", unpaid)).status;
      });
      check(s1 === 200 && atCompleted === 0, `unpaid: completed grants nothing (HTTP ${s1}, got ${what(kind, atCompleted)})`);
      const paid = sessionFor(kind, id, "paid", kind === "credits" ? 1099 : 2199);
      let s2 = 0;
      const atSucceeded = await measure(kind, async () => {
        s2 = (await deliver("checkout.session.async_payment_succeeded", paid)).status;
      });
      check(s2 === 200 && atSucceeded === GRANT[kind], `unpaid -> async_payment_succeeded grants ${what(kind, atSucceeded)} (HTTP ${s2})`);
      if (kind === "credits") {
        const again = await measure(kind, async () => void (await deliver("checkout.session.async_payment_succeeded", paid)));
        check(again === 0, "a repeated async_payment_succeeded delivery adds nothing (idempotency unchanged)");
      }
    }

    // 4. unpaid, then the async payment fails
    {
      const id = `cs_${kind}_async_fail`;
      const unpaid = sessionFor(kind, id, "unpaid", kind === "credits" ? 1099 : 2199);
      let s1 = 0;
      let s2 = 0;
      const total = await measure(kind, async () => {
        s1 = (await deliver("checkout.session.completed", unpaid)).status;
        s2 = (await deliver("checkout.session.async_payment_failed", unpaid)).status;
      });
      check(s1 === 200 && s2 === 200 && total === 0, `unpaid -> async_payment_failed: never granted (HTTP ${s1} / ${s2}, got ${what(kind, total)})`);
    }
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
