/**
 * REAL Stripe test-mode checks for the credit-package checkout and ADMINFREE email suppression.
 *
 * Unlike scripts/test-email-suppression.ts (Stripe stubbed with fixtures), Stripe is NOT stubbed here: every
 * session below is created in, and read back from, Stripe's test mode. Only the edges that would otherwise
 * touch production are stubbed:
 *   - Prisma is an in-memory stub (the real DATABASE_URL points at the shared production database);
 *   - NextAuth's auth() returns "not signed in" (it needs a live request context);
 *   - Resend's Emails.send is a recorder (no email ever leaves the machine; RESEND_API_KEY is fake).
 *
 *   1. /api/stripe/checkout (the pricing page's Buy Now handler) creates a real Checkout Session for both
 *      packages, with and without a ?email= prefill, with a malformed prefill, and via a legacy priceId body.
 *   2. A real Checkout Session with the real ADMINFREE promotion code applied goes through the real webhook
 *      handler (app/api/stripe/webhook/route.ts); the handler's own discount lookup hits Stripe. No email may
 *      be sent. Control: the same flow without the promotion code sends both emails.
 *      Pass --session cs_test_... to use an already-COMPLETED test session instead: its real
 *      checkout.session.completed event is fetched from Stripe and replayed byte-for-byte.
 *
 * Needs STRIPE_TEST_SECRET_KEY (sk_test_...). Without it the script prints SKIPPED and exits 0, so CI stays
 * green until the secret is configured; a live key is refused outright.
 */
import Module from "node:module";
import path from "node:path";

const TEST_KEY = process.env.STRIPE_TEST_SECRET_KEY?.trim();
if (!TEST_KEY) {
  console.log("SKIPPED: STRIPE_TEST_SECRET_KEY is not set -- real Stripe test-mode checks not run.");
  process.exit(0);
}
if (!TEST_KEY.startsWith("sk_test_")) {
  console.error("Refusing to run: STRIPE_TEST_SECRET_KEY must be a TEST-mode key (sk_test_...).");
  process.exit(1);
}

process.env.STRIPE_SECRET_KEY = TEST_KEY;
process.env.STRIPE_WEBHOOK_SECRET = "whsec_local_replay_test";
process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable";
process.env.RESEND_API_KEY = "re_test_stub_not_a_real_key";
process.env.FROM_EMAIL = "LogiVisa Test <noreply@example.test>";
process.env.FULL_CHECK_NOTIFICATION_EMAIL = "internal-notify@example.test";
process.env.NEXT_PUBLIC_BASE_URL = "https://example.test";
process.env.ADMIN_EMAILS = "admin@example.test";
process.env.KNOWN_TEST_EMAILS = "";
// Set to "" rather than deleted: an env loader in the import chain re-reads .env files and only fills in
// variables that are absent. Empty means "no override" to lib/stripe/credit-packages.ts.
for (const k of ["STRIPE_STARTER_CREDITS_PRICE_ID", "STRIPE_COMPREHENSIVE_CREDITS_PRICE_ID", "SIMULATE_EMAIL_DELIVERY", "ENABLE_TRANSACTIONAL_EMAILS"]) {
  process.env[k] = "";
}

const CUSTOMER = "customer@example.test";
let failures = 0;
function check(cond: boolean, msg: string) {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}`);
  }
}

// auth() stub: registered before the checkout route is loaded, under the path "@/auth" resolves to.
const authPath = path.resolve(__dirname, "../auth.ts");
const authModule = new Module(authPath);
authModule.filename = authPath;
authModule.loaded = true;
authModule.exports = { auth: async () => null };
(require.cache as Record<string, unknown>)[authPath] = authModule;

async function main() {
  const argSession = process.argv.includes("--session") ? process.argv[process.argv.indexOf("--session") + 1] : undefined;

  // ── stubs: Resend + Prisma ─────────────────────────────────────────────────
  const sent: Array<{ to: string[]; subject: string }> = [];
  const logs: string[] = [];
  const realLog = console.log;
  console.log = (...args: unknown[]) => {
    logs.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
    realLog(...args);
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resend } = require("resend") as typeof import("resend");
  (Object.getPrototypeOf(new Resend("re_stub").emails) as { send: unknown }).send = async (payload: { to: string | string[]; subject: string }) => {
    sent.push({ to: Array.isArray(payload.to) ? payload.to : [payload.to], subject: payload.subject });
    return { data: { id: "stub" }, error: null };
  };
  (globalThis as { prisma?: unknown }).prisma = {
    chatVisitor: {
      findFirst: async () => ({ id: "visitor-test-1", ipAddress: "127.0.0.1", userAgent: "test" }),
      create: async () => ({ id: "visitor-test-1" }),
    },
    userReport: {
      findUnique: async () => ({ id: "rep-1", email: CUSTOMER, locale: "en", fullName: "Test Person", source: "full_check", preferredPath: "189", reportJson: {}, inputJson: {} }),
      update: async () => ({}),
    },
    transaction: { findUnique: async () => null, create: async () => ({}) },
    user: { findUnique: async () => null },
    $queryRawUnsafe: async () => [
      { id: "rep-1", email: CUSTOMER, locale: "en", report_json: {}, input_json: {}, agent_id: null, is_unlocked: true, full_name: "Test Person", preview_data: null },
    ],
    $executeRawUnsafe: async () => 0,
    $disconnect: async () => undefined,
  };

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = (require("stripe") as { default?: typeof import("stripe").default }).default ?? (require("stripe") as typeof import("stripe").default);
  const stripe = new Stripe(TEST_KEY!);
  const { NextRequest } = await import("next/server");
  const { POST: checkoutPOST } = await import("../app/api/stripe/checkout/route");
  const { POST: webhookPOST } = await import("../app/api/stripe/webhook/route");
  const { CREDIT_PACKAGES, getCreditPackagePriceId } = await import("../lib/stripe/credit-packages");

  // ── 1. credit-package checkout (BUG 1) ─────────────────────────────────────
  console.log("\n=== 1. /api/stripe/checkout creates a real test-mode Checkout Session ===");
  const postCheckout = (body: unknown) =>
    checkoutPOST(
      new NextRequest("http://localhost/api/stripe/checkout", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json", "user-agent": "test-stripe-real", "x-forwarded-for": "127.0.0.1" },
      }),
    );

  const cases: Array<{ label: string; body: Record<string, unknown>; plan: "starter" | "comprehensive"; expectEmail: string | null }> = [
    { label: "starter, no ?email=", body: { plan: "starter" }, plan: "starter", expectEmail: null },
    { label: "comprehensive, no ?email=", body: { plan: "comprehensive" }, plan: "comprehensive", expectEmail: null },
    { label: "starter, ?email=buyer@example.test", body: { plan: "starter", email: "buyer@example.test" }, plan: "starter", expectEmail: "buyer@example.test" },
    { label: "comprehensive, ?email=buyer@example.test", body: { plan: "comprehensive", email: " buyer@example.test " }, plan: "comprehensive", expectEmail: "buyer@example.test" },
    { label: "starter, malformed ?email=not-an-email (ignored, not fatal)", body: { plan: "starter", email: "not-an-email" }, plan: "starter", expectEmail: null },
    { label: "legacy body { priceId } (old cached bundle)", body: { priceId: getCreditPackagePriceId("comprehensive") }, plan: "comprehensive", expectEmail: null },
  ];

  const report: Array<Record<string, unknown>> = [];
  for (const c of cases) {
    console.log(`\n-- ${c.label}`);
    const res = await postCheckout(c.body);
    const data = (await res.json()) as { url?: string; error?: string };
    check(res.status === 200 && typeof data.url === "string" && data.url.startsWith("https://checkout.stripe.com/"), `HTTP ${res.status}, Checkout URL returned${data.error ? ` (error: ${data.error})` : ""}`);
    if (!data.url) continue;
    const sessionId = data.url.match(/cs_test_[A-Za-z0-9]+/)?.[0];
    check(Boolean(sessionId), `test-mode session id in the Checkout URL (${sessionId})`);
    if (!sessionId) continue;
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] });
    const items = session.line_items?.data ?? [];
    check(session.livemode === false, "session is test mode");
    check(session.mode === "payment", `mode = ${session.mode}`);
    check(items.length === 1 && items[0].price?.id === getCreditPackagePriceId(c.plan), `one line item, price ${items[0]?.price?.id}`);
    check(session.metadata?.credits === String(CREDIT_PACKAGES[c.plan].credits) && session.metadata?.plan === c.plan, `metadata credits=${session.metadata?.credits} plan=${session.metadata?.plan} visitorId=${session.metadata?.visitorId}`);
    check((session.customer_email ?? null) === c.expectEmail, `customer_email = ${session.customer_email ?? "(none, Checkout asks for it)"}`);
    check(session.url === data.url, "returned URL is this session's URL");
    report.push({
      case: c.label,
      id: session.id,
      mode: session.mode,
      currency: session.currency,
      line_items: items.map((i) => `${i.quantity} x ${i.description} @ ${i.price?.unit_amount} ${i.price?.currency} (${i.price?.id}, tax_behavior=${i.price?.tax_behavior})`),
      amount_subtotal: session.amount_subtotal,
      amount_total: session.amount_total,
      automatic_tax: session.automatic_tax?.enabled,
      customer_email: session.customer_email,
    });
  }
  {
    const res = await postCheckout({ plan: "enterprise" });
    check(res.status === 400, `unknown package is rejected with 400 (got ${res.status})`);
  }

  // ── 2. ADMINFREE on a real session through the real webhook (BUG 2) ────────
  console.log("\n=== 2. real ADMINFREE session through the real webhook handler ===");
  const promos = await stripe.promotionCodes.list({ code: "ADMINFREE", active: true, limit: 1 });
  const promo = promos.data[0];
  check(Boolean(promo), `ADMINFREE promotion code exists and is active in test mode${promo ? ` (${promo.id})` : ""}`);

  // The same parameters app/api/checkout/route.ts uses for the premium report, with the promotion code
  // pre-applied (a customer types it into Checkout; the API can't set allow_promotion_codes and discounts
  // together).
  const premiumSessionParams = (discounts?: Array<{ promotion_code: string }>) => ({
    mode: "payment" as const,
    line_items: [
      {
        price_data: { currency: "aud", product_data: { name: "Full Visa Readiness Report (Premium)", tax_code: "txcd_10000000" }, unit_amount: 2199, tax_behavior: "inclusive" as const },
        quantity: 1,
      },
    ],
    ...(discounts ? { discounts } : { allow_promotion_codes: true }),
    customer_email: CUSTOMER,
    billing_address_collection: "required" as const,
    automatic_tax: { enabled: true },
    success_url: "https://example.test/success?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "https://example.test/cancel",
    metadata: { productType: "premium", email: CUSTOMER, assessmentId: "rep-1", reportId: "rep-1", leadId: "rep-1", agentId: "", userId: "", locale: "en" },
  });

  async function replay(payload: string) {
    sent.length = 0;
    logs.length = 0;
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
    const res = await webhookPOST(new NextRequest("http://localhost/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": header } }));
    return { status: res.status, sent: [...sent], suppression: logs.filter((l) => l.startsWith("[email-suppression]")) };
  }

  const eventFor = (session: unknown) => JSON.stringify({ id: `evt_local_${Date.now()}`, object: "event", type: "checkout.session.completed", data: { object: session } });

  if (promo) {
    let adminPayload: string;
    let adminSessionId: string;
    if (argSession) {
      const events = await stripe.events.list({ type: "checkout.session.completed", limit: 50 });
      const evt = events.data.find((e) => (e.data.object as { id?: string }).id === argSession);
      check(Boolean(evt), `real checkout.session.completed event found for ${argSession}`);
      if (!evt) throw new Error("no completed event for the given session");
      adminPayload = JSON.stringify(evt);
      adminSessionId = argSession;
    } else {
      const created = await stripe.checkout.sessions.create(premiumSessionParams([{ promotion_code: promo.id }]));
      adminPayload = eventFor(created);
      adminSessionId = created.id;
    }
    const s = await stripe.checkout.sessions.retrieve(adminSessionId);
    console.log(`  session ${s.id}: status=${s.status} subtotal=${s.amount_subtotal} total=${s.amount_total} discounts=${JSON.stringify(s.discounts)}`);
    check(s.amount_total === 0 && (s.discounts ?? []).some((d) => (typeof d.promotion_code === "string" ? d.promotion_code : d.promotion_code?.id) === promo.id), "Stripe applied ADMINFREE: amount_total 0, promotion code on the session");

    const r = await replay(adminPayload);
    check(r.status === 200, `webhook returned ${r.status}`);
    check(r.sent.length === 0, `no email sent (got ${r.sent.length}: ${r.sent.map((m) => m.subject).join(" | ")})`);
    check(r.suppression.includes("[email-suppression] suppressed reason=admin_promo sender=stripe_webhook_admin_notification"), "internal PAID notification suppressed, reason=admin_promo");
    check(r.suppression.includes("[email-suppression] suppressed reason=admin_promo sender=stripe_webhook_customer_report_email"), "customer report email suppressed, reason=admin_promo");
  }

  console.log("\n-- control: same real session shape, no promotion code");
  {
    const created = await stripe.checkout.sessions.create(premiumSessionParams());
    const r = await replay(eventFor(created));
    check(r.status === 200, `webhook returned ${r.status}`);
    check(r.suppression.length === 0, "nothing suppressed");
    check(r.sent.length === 2, `both emails sent (got ${r.sent.length}: ${r.sent.map((m) => m.subject).join(" | ")})`);
  }

  console.log = realLog;
  console.log("\n=== real test-mode Checkout Sessions created by /api/stripe/checkout ===");
  for (const row of report) console.log(JSON.stringify(row, null, 2));
  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
