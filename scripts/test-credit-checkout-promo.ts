/**
 * Promotion codes on the AI-assistant credit-package checkout (Starter / Comprehensive).
 *
 * Runs the REAL /api/stripe/checkout route and the REAL Stripe webhook handler. Only the edges are stubbed: Stripe's
 * checkout.sessions.create / retrieve (a recorder; no Stripe key is used), NextAuth's auth() ("not signed in") and
 * Prisma (in memory). No database is touched and no request leaves the machine.
 *
 *   1. Both packages: the session is created with allow_promotion_codes: true (as the report checkout does), no
 *      `discounts` (Stripe rejects both together), the unchanged GST-inclusive price, and metadata credits 50 / 150.
 *   2. A 100% promotion code (amount_total 0, payment_status "no_payment_required"): the webhook still credits the
 *      package the buyer chose -- 50 for Starter, 150 for Comprehensive -- once; a repeated delivery adds nothing.
 *
 *   npx tsx scripts/test-credit-checkout-promo.ts
 */
import Module from "node:module";
import path from "node:path";

process.env.STRIPE_SECRET_KEY = "sk_test_stub_not_a_real_key";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_stub";
// Always a dummy: the local DATABASE_URL is production, and nothing here may connect (Prisma is stubbed below).
process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable";
process.env.NEXT_PUBLIC_BASE_URL = "https://example.test";
process.env.RESEND_API_KEY = "";

let failures = 0;
function check(cond: boolean, msg: string) {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}`);
  }
}

// auth() stub, registered under the path "@/auth" resolves to before the checkout route is loaded.
const authPath = path.resolve(__dirname, "../auth.ts");
const authModule = new Module(authPath);
authModule.filename = authPath;
authModule.loaded = true;
authModule.exports = { auth: async () => null };
(require.cache as Record<string, unknown>)[authPath] = authModule;

type Params = Record<string, unknown> & { line_items?: Array<{ price_data?: { unit_amount?: number; currency?: string; tax_behavior?: string } }>; metadata?: Record<string, string> };

async function main() {
  // ── Stripe: record session params; retrieve returns whatever fixture the test registered ──
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = (require("stripe") as { default?: typeof import("stripe").default }).default ?? (require("stripe") as typeof import("stripe").default);
  const probe = new Stripe("sk_test_stub");
  const created: Params[] = [];
  const fixtures = new Map<string, unknown>();
  const sessionsProto = Object.getPrototypeOf(probe.checkout.sessions) as { create: unknown; retrieve: unknown };
  sessionsProto.create = async (params: Params) => {
    created.push(params);
    const id = `cs_test_stub_${created.length}`;
    return { id, url: `https://checkout.stripe.com/c/pay/${id}` };
  };
  sessionsProto.retrieve = async (id: string) => fixtures.get(id);

  // ── Prisma (in memory): the visitor, the purchase ledger, the email link ──
  const VISITOR = "visitor-promo-1";
  const visitor = { id: VISITOR, ipAddress: "127.0.0.1", userAgent: "test", messageCount: 5, isPremium: false, premiumCredits: 0 };
  const purchases = new Map<string, { credits: number }>();
  const db = {
    chatVisitor: {
      findFirst: async () => visitor,
      findUnique: async () => visitor,
      create: async () => visitor,
      update: async (args: { data: { premiumCredits?: { increment?: number } } }) => {
        visitor.premiumCredits += args.data.premiumCredits?.increment ?? 0;
        return visitor;
      },
    },
    chatCreditPurchase: {
      findUnique: async (args: { where: { stripeSessionId: string } }) => (purchases.has(args.where.stripeSessionId) ? { id: "p" } : null),
      create: async (args: { data: { stripeSessionId: string; credits: number } }) => {
        purchases.set(args.data.stripeSessionId, { credits: args.data.credits });
        return { id: "p" };
      },
    },
    chatCreditLink: { upsert: async () => ({}) },
    transaction: { findUnique: async () => null, create: async () => ({}) },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(db),
    $disconnect: async () => undefined,
  };
  (globalThis as { prisma?: unknown }).prisma = db;

  const { NextRequest } = await import("next/server");
  const { POST: checkoutPOST } = await import("../app/api/stripe/checkout/route");
  const { POST: webhookPOST } = await import("../app/api/stripe/webhook/route");
  const { CREDIT_PACKAGES } = await import("../lib/stripe/credit-packages");
  const { PRODUCT_PRICE_AUD_CENTS } = await import("../lib/pricing");

  // Prices must not move with this change: the advertised GST-inclusive amounts.
  const PRICE = { starter: 1099, comprehensive: 2199 } as const;
  check(PRODUCT_PRICE_AUD_CENTS.credits_starter === PRICE.starter && PRODUCT_PRICE_AUD_CENTS.credits_comprehensive === PRICE.comprehensive, "prices unchanged: Starter A$10.99, Comprehensive A$21.99");

  const replay = async (session: unknown) => {
    const payload = JSON.stringify({ id: `evt_local_${Date.now()}`, object: "event", type: "checkout.session.completed", data: { object: session } });
    const header = probe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
    return webhookPOST(new NextRequest("http://localhost/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": header } }));
  };

  for (const plan of ["starter", "comprehensive"] as const) {
    console.log(`\n=== ${plan} ===`);
    const res = await checkoutPOST(
      new NextRequest("http://localhost/api/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ plan, email: "buyer@example.test" }),
        headers: { "content-type": "application/json", "user-agent": "test", "x-forwarded-for": "127.0.0.1" },
      })
    );
    const data = (await res.json()) as { url?: string };
    const params = created.at(-1)!;
    check(res.status === 200 && Boolean(data.url), `checkout returned a Checkout URL (HTTP ${res.status})`);
    check(params.allow_promotion_codes === true, "allow_promotion_codes: true (customers can enter a promotion code)");
    check(!("discounts" in params), "no `discounts` on the session (Stripe rejects it together with allow_promotion_codes)");
    const item = params.line_items?.[0]?.price_data;
    check(item?.unit_amount === PRICE[plan] && item?.currency === "aud" && item?.tax_behavior === "inclusive", `line item unchanged: ${item?.unit_amount} ${item?.currency}, ${item?.tax_behavior}`);
    check(params.metadata?.credits === String(CREDIT_PACKAGES[plan].credits) && params.metadata?.plan === plan && params.metadata?.visitorId === VISITOR, `metadata: plan=${params.metadata?.plan} credits=${params.metadata?.credits} visitorId=${params.metadata?.visitorId}`);

    // The completed session as Stripe sends it after a 100% promotion code: total A$0, nothing charged.
    const sessionId = `cs_test_promo_${plan}`;
    const completed = {
      id: sessionId,
      object: "checkout.session",
      mode: "payment",
      status: "complete",
      payment_status: "no_payment_required",
      amount_subtotal: PRICE[plan],
      amount_total: 0,
      currency: "aud",
      total_details: { amount_discount: PRICE[plan], amount_shipping: 0, amount_tax: 0 },
      discounts: [{ promotion_code: "promo_test_100_off" }],
      customer_details: { email: "buyer@example.test" },
      customer_email: params.customer_email ?? null,
      metadata: params.metadata,
    };
    fixtures.set(sessionId, completed);
    const before = visitor.premiumCredits;
    const hook = await replay(completed);
    check(hook.status === 200, `webhook accepted the A$0 session (HTTP ${hook.status})`);
    check(visitor.premiumCredits - before === CREDIT_PACKAGES[plan].credits, `credited ${visitor.premiumCredits - before} (expected ${CREDIT_PACKAGES[plan].credits} for ${plan})`);
    check(purchases.get(sessionId)?.credits === CREDIT_PACKAGES[plan].credits, "purchase ledger row records the package's credits");
    const again = await replay(completed);
    check(again.status === 200 && visitor.premiumCredits - before === CREDIT_PACKAGES[plan].credits, "a repeated delivery of the same session adds nothing");
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
