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
 *   1. /api/stripe/checkout (the /pricing Buy Now handler) and /api/checkout (the ebooks) create real Checkout
 *      Sessions for all four GST-inclusive products (both ebooks, both credit packages): one AUD line item at
 *      the lib/pricing.ts amount, tax_behavior "inclusive", amount_total equal to the advertised price. The same
 *      line items with an Australian customer address must carry GST of exactly price/11 inside the total.
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
  const { POST: productCheckoutPOST } = await import("../app/api/checkout/route");
  const { POST: webhookPOST } = await import("../app/api/stripe/webhook/route");
  const { CREDIT_PACKAGES, getCreditPackageLineItem } = await import("../lib/stripe/credit-packages");
  const { getCheckoutLineItem } = await import("../lib/stripe/line-items");
  const { PRODUCT_PRICE_AUD_CENTS } = await import("../lib/pricing");

  type ProductKey = "pdf_book" | "pdf_book_global" | "credits_starter" | "credits_comprehensive";
  const expectedCents = (key: ProductKey) => PRODUCT_PRICE_AUD_CENTS[key];

  /** Shared assertions: one inclusive AUD line item at the lib/pricing.ts amount, GST never added on top. */
  async function inspectSession(sessionId: string, key: ProductKey, billingRequired = true) {
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] });
    const items = session.line_items?.data ?? [];
    const price = items[0]?.price;
    check(session.livemode === false, "session is test mode");
    check(session.mode === "payment", `mode = ${session.mode}`);
    check(items.length === 1 && price?.unit_amount === expectedCents(key) && price?.currency === "aud", `one line item: ${items[0]?.description} @ ${price?.unit_amount} ${price?.currency}`);
    check(price?.tax_behavior === "inclusive", `tax_behavior = ${price?.tax_behavior}`);
    check(session.automatic_tax?.enabled === true, "automatic_tax on");
    if (billingRequired) check(session.billing_address_collection === "required", "billing address required");
    check(session.amount_total === expectedCents(key), `amount_total = ${session.amount_total} (the advertised GST-inclusive price)`);
    return { session, items };
  }

  const sessionIdFrom = (url: string | undefined) => url?.match(/cs_test_[A-Za-z0-9]+/)?.[0];

  // ── 1a. credit packages through /api/stripe/checkout (the /pricing Buy Now handler) ──
  console.log("\n=== 1a. /api/stripe/checkout creates a real test-mode Checkout Session ===");
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
  ];

  for (const c of cases) {
    console.log(`\n-- ${c.label}`);
    const res = await postCheckout(c.body);
    const data = (await res.json()) as { url?: string; error?: string };
    check(res.status === 200 && typeof data.url === "string" && data.url.startsWith("https://checkout.stripe.com/"), `HTTP ${res.status}, Checkout URL returned${data.error ? ` (error: ${data.error})` : ""}`);
    const sessionId = sessionIdFrom(data.url);
    if (!sessionId) {
      check(false, "test-mode session id in the Checkout URL");
      continue;
    }
    const { session } = await inspectSession(sessionId, c.plan === "starter" ? "credits_starter" : "credits_comprehensive");
    check(session.metadata?.credits === String(CREDIT_PACKAGES[c.plan].credits) && session.metadata?.plan === c.plan, `metadata credits=${session.metadata?.credits} plan=${session.metadata?.plan} visitorId=${session.metadata?.visitorId}`);
    check((session.customer_email ?? null) === c.expectEmail, `customer_email = ${session.customer_email ?? "(none, Checkout asks for it)"}`);
    check(session.url === data.url, "returned URL is this session's URL");
  }
  {
    const res = await postCheckout({ plan: "enterprise" });
    check(res.status === 400, `unknown package is rejected with 400 (got ${res.status})`);
    const legacy = await postCheckout({ priceId: "price_anything" });
    check(legacy.status === 400, `a bare priceId body is rejected with 400 -- the browser can't pick the price (got ${legacy.status})`);
  }

  // ── 1b. ebooks through /api/checkout (StripeCheckoutButton on the guides / PDF modal) ──
  console.log("\n=== 1b. /api/checkout creates a real test-mode Checkout Session for both ebooks ===");
  for (const productType of ["pdf_book", "pdf_book_global"] as const) {
    for (const locale of ["en", "tr", "zh-Hans"]) {
      console.log(`\n-- ${productType}, locale ${locale}`);
      const res = await productCheckoutPOST(
        new NextRequest("http://localhost/api/checkout", {
          method: "POST",
          body: JSON.stringify({ productType, locale, email: "buyer@example.test" }),
          headers: { "content-type": "application/json" },
        }),
      );
      const data = (await res.json()) as { url?: string; error?: string };
      check(res.status === 200, `HTTP ${res.status}${data.error ? ` (error: ${data.error})` : ""}`);
      const sessionId = sessionIdFrom(data.url);
      if (!sessionId) {
        check(false, "test-mode session id in the Checkout URL");
        continue;
      }
      const { session } = await inspectSession(sessionId, productType);
      check(session.metadata?.productType === productType, `metadata productType = ${session.metadata?.productType}`);
    }
  }

  // ── 1c. the same line items with an Australian customer address: Stripe computes the GST ──
  // An open session has no tax until the buyer's address is known. A test customer with an Australian
  // address makes Stripe Tax calculate at creation. The line items are the exact objects the two routes send.
  // billing_address_collection is left at Stripe's default here (the routes' "required" is checked in 1a/1b).
  // The invariant asserted unconditionally: amount_total is the advertised price with the address known too --
  // GST is never added on top. The GST amount itself is asserted only when Stripe reports automatic_tax
  // "complete": it needs an AU tax registration in the Stripe account's TEST mode (live has one; test mode had
  // none as of 2026-09-23) and, for Checkout, usually the address typed on the hosted page -- otherwise the
  // status stays "requires_location_inputs" and the reason is printed instead of failing.
  console.log("\n=== 1c. Australian address: real amount_total / amount_tax per product ===");
  const customer = await stripe.customers.create({
    email: "au-buyer@example.test",
    name: "AU Test Buyer",
    address: { line1: "1 Martin Place", city: "Sydney", state: "NSW", postal_code: "2000", country: "AU" },
    metadata: { purpose: "scripts/test-stripe-real.ts GST check" },
  });
  const taxRows: Array<Record<string, unknown>> = [];
  const auProducts: Array<{ key: ProductKey; lineItem: ReturnType<typeof getCheckoutLineItem> }> = [
    { key: "pdf_book", lineItem: getCheckoutLineItem("pdf_book") },
    { key: "pdf_book_global", lineItem: getCheckoutLineItem("pdf_book_global") },
    { key: "credits_starter", lineItem: getCreditPackageLineItem("starter") },
    { key: "credits_comprehensive", lineItem: getCreditPackageLineItem("comprehensive") },
  ];
  try {
    for (const { key, lineItem } of auProducts) {
      console.log(`\n-- ${key}`);
      const created = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [lineItem],
        customer: customer.id,
        customer_update: { address: "auto", name: "auto" },
        automatic_tax: { enabled: true },
        success_url: "https://example.test/success",
        cancel_url: "https://example.test/cancel",
      });
      const { session } = await inspectSession(created.id, key, false);
      const cents = expectedCents(key);
      const tax = session.total_details?.amount_tax ?? null;
      const expectedTax = Math.round(cents / 11);
      if (session.automatic_tax?.status === "complete") {
        check(tax === expectedTax, `amount_tax = ${tax} (GST inside the price: ${cents}/11 = ${expectedTax})`);
      } else {
        console.log(`  ⚠️  GST amount not computed by Stripe: automatic_tax.status = ${session.automatic_tax?.status} (amount_tax ${tax}); expected ${expectedTax} once computed`);
      }
      taxRows.push({
        product: key,
        session: session.id,
        unit_amount: cents,
        amount_subtotal: session.amount_subtotal,
        amount_tax: tax,
        amount_total: session.amount_total,
        automatic_tax_status: session.automatic_tax?.status,
      });
    }
  } finally {
    await stripe.customers.del(customer.id);
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
  console.log("\n=== Australian-address sessions (test mode) ===");
  for (const row of taxRows) console.log(JSON.stringify(row));
  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
