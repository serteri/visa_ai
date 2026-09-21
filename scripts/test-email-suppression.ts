/**
 * Free-admin-order email suppression (lib/email/suppression.ts).
 *
 * Runs the REAL Stripe webhook handler, generateAndSendReport and the real senders. Only the edges are
 * stubbed, so nothing can leave the machine:
 *   - Resend's Emails.send is replaced by a recorder (no email is ever sent);
 *   - Stripe's sessions.retrieve / promotionCodes.retrieve return fixtures (no Stripe key is used, all keys
 *     below are fake, and global fetch throws if anything tries the network);
 *   - the Prisma client is an in-memory stub (no database is touched).
 *
 * Fixtures only: admin@example.test etc. are set through the env variables the app really reads
 * (ADMIN_EMAILS, KNOWN_TEST_EMAILS); no real address appears in this file.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

process.env.DATABASE_URL ??= "postgresql://u:p@localhost:5432/d?sslmode=disable";
process.env.RESEND_API_KEY = "re_test_stub_not_a_real_key";
process.env.STRIPE_SECRET_KEY = "sk_test_stub_not_a_real_key";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_stub";
process.env.FROM_EMAIL = "LogiVisa Test <noreply@example.test>";
process.env.FULL_CHECK_NOTIFICATION_EMAIL = "internal-notify@example.test";
process.env.PDF_LEAD_NOTIFICATION_EMAIL = "pdf-lead@example.test";
process.env.NEXT_PUBLIC_BASE_URL = "https://example.test";
// Quotes/whitespace/case in the list on purpose: the parser must cope with a value pasted verbatim.
process.env.ADMIN_EMAILS = ' admin@example.test , "Second.Admin@Example.Test" ';
process.env.KNOWN_TEST_EMAILS = "known-test@example.test";
delete process.env.SIMULATE_EMAIL_DELIVERY;
delete process.env.ENABLE_TRANSACTIONAL_EMAILS;

let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error(`  ❌ ${msg}`);
  }
}
function ok(msg: string) {
  console.log(`  ✅ ${msg}`);
}

const INTERNAL_RECIPIENTS = new Set(["internal-notify@example.test", "pdf-lead@example.test"]);
const CUSTOMER = "customer@example.test";

type Sent = { to: string[]; subject: string };

async function main() {
  // ── stubs ────────────────────────────────────────────────────────────────
  const sent: Sent[] = [];
  const logs: string[] = [];
  let networkAttempts = 0;

  const realLog = console.log;
  console.log = (...args: unknown[]) => {
    const line = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    logs.push(line);
    realLog(...args);
  };
  globalThis.fetch = (async () => {
    networkAttempts++;
    throw new Error("network access is forbidden in test-email-suppression");
  }) as typeof fetch;

  // require(), not import(): the route code is loaded as CommonJS, and these packages ship separate CJS and
  // ESM builds -- patching the ESM copy would leave the copy the app really uses unpatched.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeHttps = require("node:https") as { request: unknown };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeHttp = require("node:http") as { request: unknown };
  for (const mod of [nodeHttps, nodeHttp]) {
    mod.request = () => {
      networkAttempts++;
      throw new Error("network access is forbidden in test-email-suppression");
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resend } = require("resend") as typeof import("resend");
  const emailsProto = Object.getPrototypeOf(new Resend("re_stub").emails) as { send: unknown };
  emailsProto.send = async (payload: { to: string | string[]; subject: string }) => {
    sent.push({ to: Array.isArray(payload.to) ? payload.to : [payload.to], subject: payload.subject });
    return { data: { id: "stub" }, error: null };
  };

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = (require("stripe") as { default?: typeof import("stripe").default }).default ?? (require("stripe") as typeof import("stripe").default);
  const probe = new Stripe("sk_test_stub");
  const sessionFixtures = new Map<string, unknown>();
  const promotionFixtures = new Map<string, string>();
  let failStripeLookup = false;
  (Object.getPrototypeOf(probe.checkout.sessions) as { retrieve: unknown }).retrieve = async (id: string) => {
    if (failStripeLookup) throw new Error("stripe unavailable (test)");
    return sessionFixtures.get(id);
  };
  (Object.getPrototypeOf(probe.promotionCodes) as { retrieve: unknown }).retrieve = async (id: string) => ({ id, code: promotionFixtures.get(id) ?? "UNKNOWN" });

  const updates: Array<Record<string, unknown>> = [];
  const transactions: Array<Record<string, unknown>> = [];
  const executed: string[] = [];
  let reportRowEmail = CUSTOMER;
  (globalThis as { prisma?: unknown }).prisma = {
    userReport: {
      findUnique: async () => ({ id: "rep-1", email: reportRowEmail, locale: "en", fullName: "Test Person", source: "full_check", preferredPath: "189", reportJson: {}, inputJson: {} }),
      update: async (args: Record<string, unknown>) => {
        updates.push(args);
        return {};
      },
    },
    transaction: {
      findUnique: async () => null,
      create: async (args: Record<string, unknown>) => {
        transactions.push(args);
        return {};
      },
    },
    user: { findUnique: async () => null },
    $queryRawUnsafe: async () => [
      { id: "rep-1", email: reportRowEmail, locale: "en", report_json: {}, input_json: {}, agent_id: null, is_unlocked: true, full_name: "Test Person", preview_data: null },
    ],
    $executeRawUnsafe: async (sql: string) => {
      executed.push(sql);
      return 0;
    },
    $disconnect: async () => undefined,
  };

  const { POST } = await import("../app/api/stripe/webhook/route");
  const { generateAndSendReport } = await import("../lib/services/report-service");
  const { getReportEmailSuppressionReason, isAdminAllowListedEmail, isAdminPromoCode } = await import("../lib/email/suppression");

  // ── helpers ──────────────────────────────────────────────────────────────
  type SessionSpec = {
    id: string;
    email: string;
    productType?: "premium" | "pdf_book" | "pdf_book_global";
    amountTotal?: number;
    /** What Stripe reports as applied to the session (server-side, expanded objects). */
    discounts?: Array<{ coupon?: { id: string; name?: string | null } | null; promotion_code?: { code: string } | string | null }>;
    reportEmailOnRecord?: string;
  };

  function reset() {
    sent.length = 0;
    updates.length = 0;
    transactions.length = 0;
    executed.length = 0;
    logs.length = 0;
    failStripeLookup = false;
    reportRowEmail = CUSTOMER;
  }

  async function runWebhook(spec: SessionSpec): Promise<Response> {
    reset();
    if (spec.reportEmailOnRecord) reportRowEmail = spec.reportEmailOnRecord;
    const session = {
      id: spec.id,
      object: "checkout.session",
      customer_email: spec.email,
      customer_details: { email: spec.email, name: "Test Person" },
      amount_total: spec.amountTotal ?? 2199,
      currency: "aud",
      total_details: { amount_tax: 0 },
      metadata: {
        productType: spec.productType ?? "premium",
        email: spec.email,
        assessmentId: "rep-1",
        reportId: "rep-1",
        leadId: spec.productType && spec.productType !== "premium" ? "" : "rep-1",
        agentId: "",
      },
    };
    sessionFixtures.set(spec.id, { ...session, discounts: spec.discounts ?? [], total_details: { amount_tax: 0, breakdown: { discounts: [], taxes: [] } } });
    const payload = JSON.stringify({ id: `evt_${spec.id}`, object: "event", type: "checkout.session.completed", data: { object: session } });
    const header = probe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
    const { NextRequest } = await import("next/server");
    return POST(new NextRequest("http://localhost/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": header } }));
  }

  const internalSent = () => sent.filter((s) => s.to.some((t) => INTERNAL_RECIPIENTS.has(t)));
  const customerSent = () => sent.filter((s) => !s.to.some((t) => INTERNAL_RECIPIENTS.has(t)));
  const suppressionLines = () => logs.filter((l) => l.startsWith("[email-suppression]"));

  function assertNoAddressesInSuppressionLogs(label: string) {
    for (const line of suppressionLines()) {
      if (/@|example\.test/i.test(line)) check(false, `${label}: suppression log line leaks an address: "${line}"`);
      if (!/^\[email-suppression\] suppressed reason=(admin_email|admin_promo) sender=[a-z_]+$/.test(line)) check(false, `${label}: suppression log line is not "reason code + sender" only: "${line}"`);
    }
  }

  function expectRecordsKept(label: string) {
    const unlock = updates.find((u) => (u.data as Record<string, unknown> | undefined)?.isUnlocked === true);
    check(Boolean(unlock), `${label}: the report must still be unlocked`);
    check((unlock?.data as Record<string, unknown> | undefined)?.paymentStatus === "paid", `${label}: the paid record must still be written`);
    check(transactions.length === 1, `${label}: the transaction record must still be saved (got ${transactions.length})`);
  }

  // ── 1. pure decision ─────────────────────────────────────────────────────
  console.log("\n=== decision function ===");
  {
    const before = failures;
    check(isAdminPromoCode("ADMINFREE") && isAdminPromoCode("adminfree") && isAdminPromoCode("  AdminFree ") && isAdminPromoCode("aDmInFrEe\n"), "ADMINFREE matches case-insensitively and trimmed");
    check(!isAdminPromoCode("ADMINFREE2") && !isAdminPromoCode("FREE") && !isAdminPromoCode("") && !isAdminPromoCode(null), "other codes never match");
    for (const e of ["admin@example.test", "ADMIN@EXAMPLE.TEST", "  Admin@Example.Test  ", "second.admin@example.test", "\"Second.Admin@Example.Test\"", "known-test@example.test", "Known-Test@Example.Test "]) {
      check(isAdminAllowListedEmail(e), `allow-listed variant "${e}" must match`);
    }
    for (const e of ["customer@example.test", "admin@example.test.evil", "xadmin@example.test", "", null, undefined]) {
      check(!isAdminAllowListedEmail(e), `"${e}" must not match`);
    }
    check(getReportEmailSuppressionReason({ email: CUSTOMER, promotionCode: ["SAVE10"] }) === null, "normal order: not suppressed");
    check(getReportEmailSuppressionReason({ email: CUSTOMER, promotionCode: [" adminfree "] }) === "admin_promo", "promo variant: admin_promo");
    check(getReportEmailSuppressionReason({ email: [CUSTOMER, "Admin@Example.Test"], promotionCode: [] }) === "admin_email", "any address on the list: admin_email");
    if (failures === before) ok("decision function");
  }

  // ── 2. Stripe webhook: report unlock ─────────────────────────────────────
  console.log("\n=== webhook: ADMINFREE promotion code (customer address is NOT on the admin list) ===");
  for (const [label, code] of [["ADMINFREE", "ADMINFREE"], ["lower-case", "adminfree"], ["mixed case + spaces", "  AdminFree  "]] as const) {
    const before = failures;
    const res = await runWebhook({ id: `cs_promo_${label.replace(/\W/g, "")}`, email: CUSTOMER, amountTotal: 0, discounts: [{ promotion_code: { code } }] });
    check(res.status === 200, `${label}: webhook status ${res.status}`);
    check(sent.length === 0, `${label}: expected zero emails, got ${sent.length}: ${JSON.stringify(sent)}`);
    check(suppressionLines().some((l) => l.includes("reason=admin_promo")), `${label}: expected an admin_promo suppression log line`);
    expectRecordsKept(label);
    assertNoAddressesInSuppressionLogs(label);
    if (failures === before) ok(`${label}: zero emails (internal and customer), records kept`);
  }

  console.log("\n=== webhook: ADMINFREE as a coupon (promotion code given only as an id) ===");
  {
    const before = failures;
    promotionFixtures.set("promo_admin_1", "ADMINFREE");
    let res = await runWebhook({ id: "cs_coupon_id", email: CUSTOMER, amountTotal: 0, discounts: [{ coupon: { id: "AdminFree", name: null }, promotion_code: null }] });
    check(res.status === 200 && sent.length === 0, `coupon id: expected zero emails, got ${sent.length}`);
    res = await runWebhook({ id: "cs_coupon_name", email: CUSTOMER, amountTotal: 0, discounts: [{ coupon: { id: "c_x1", name: "adminfree" }, promotion_code: null }] });
    check(res.status === 200 && sent.length === 0, `coupon name: expected zero emails, got ${sent.length}`);
    res = await runWebhook({ id: "cs_promo_by_id", email: CUSTOMER, amountTotal: 0, discounts: [{ promotion_code: "promo_admin_1" }] });
    check(res.status === 200 && sent.length === 0, `promotion code id resolved server-side: expected zero emails, got ${sent.length}`);
    expectRecordsKept("coupon");
    if (failures === before) ok("coupon id / coupon name / promotion-code id all recognised");
  }

  console.log("\n=== webhook: admin allow-list address, PAID session ===");
  for (const email of ["admin@example.test", "  ADMIN@Example.Test ", "second.admin@example.test", "known-test@example.test"]) {
    const before = failures;
    const res = await runWebhook({ id: `cs_admin_${email.trim().toLowerCase().replace(/\W/g, "")}`, email, amountTotal: 2199 });
    check(res.status === 200, `"${email}": webhook status ${res.status}`);
    check(sent.length === 0, `"${email}": expected zero emails, got ${sent.length}: ${JSON.stringify(sent)}`);
    check(suppressionLines().some((l) => l.includes("reason=admin_email")), `"${email}": expected an admin_email suppression log line`);
    expectRecordsKept(`"${email}"`);
    assertNoAddressesInSuppressionLogs(`"${email}"`);
    if (failures === before) ok(`"${email.trim()}": zero emails, records kept`);
  }

  console.log("\n=== webhook: a different promotion code, and a normal paid order (emails go out as before) ===");
  for (const [label, discounts, amount] of [
    ["other promo code SAVE10", [{ promotion_code: { code: "SAVE10" } }], 1979],
    ["other coupon", [{ coupon: { id: "WELCOME", name: "Welcome" }, promotion_code: null }], 1500],
    ["ADMINFREE-lookalike ADMINFREE2", [{ promotion_code: { code: "ADMINFREE2" } }], 0],
    ["normal paid order, no discount", [], 2199],
  ] as const) {
    const before = failures;
    const res = await runWebhook({ id: `cs_normal_${label.replace(/\W/g, "")}`, email: CUSTOMER, amountTotal: amount, discounts: [...discounts] });
    check(res.status === 200, `${label}: webhook status ${res.status}`);
    check(internalSent().length === 1, `${label}: expected 1 internal notification, got ${internalSent().length}`);
    check(customerSent().length === 1 && customerSent()[0].to.includes(CUSTOMER), `${label}: expected 1 customer email to the buyer, got ${JSON.stringify(customerSent())}`);
    check(internalSent()[0]?.subject.includes("PAID Assessment Completed") === true, `${label}: internal subject unchanged`);
    check(suppressionLines().length === 0, `${label}: nothing may be suppressed`);
    check(executed.some((s) => /pdf_sent = TRUE/.test(s)), `${label}: pdf_sent must still be recorded when the customer email goes out`);
    expectRecordsKept(label);
    if (failures === before) ok(`${label}: internal + customer email sent as before`);
  }

  console.log("\n=== webhook: Stripe discount lookup fails (must not swallow a real customer's email) ===");
  {
    const before = failures;
    reset();
    sessionFixtures.set("cs_lookup_fail", {});
    const payload = JSON.stringify({ id: "evt_lf", object: "event", type: "checkout.session.completed", data: { object: { id: "cs_lookup_fail", object: "checkout.session", customer_email: CUSTOMER, customer_details: { email: CUSTOMER }, amount_total: 2199, currency: "aud", total_details: { amount_tax: 0 }, metadata: { productType: "premium", email: CUSTOMER, assessmentId: "rep-1", leadId: "rep-1" } } } });
    failStripeLookup = true;
    const header = probe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
    const { NextRequest } = await import("next/server");
    const res = await POST(new NextRequest("http://localhost/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": header } }));
    check(res.status === 200, `webhook status ${res.status}`);
    check(internalSent().length === 1 && customerSent().length === 1, `expected both emails as before, got ${sent.length}`);
    if (failures === before) ok("lookup failure: both emails still sent");
  }

  // ── 3. Stripe webhook: PDF guide purchases ───────────────────────────────
  console.log("\n=== webhook: PDF guide purchase ===");
  {
    const before = failures;
    let res = await runWebhook({ id: "cs_pdf_normal", email: CUSTOMER, productType: "pdf_book_global", amountTotal: 1999 });
    check(res.status === 200 && sent.length === 1 && sent[0].to.includes(CUSTOMER), `normal PDF purchase: expected the customer delivery email, got ${JSON.stringify(sent)}`);
    res = await runWebhook({ id: "cs_pdf_promo", email: CUSTOMER, productType: "pdf_book_global", amountTotal: 0, discounts: [{ promotion_code: { code: "adminfree" } }] });
    check(res.status === 200 && sent.length === 0, `ADMINFREE PDF purchase: expected zero emails, got ${sent.length}`);
    res = await runWebhook({ id: "cs_pdf_admin", email: " Admin@Example.Test", productType: "pdf_book", amountTotal: 1999 });
    check(res.status === 200 && sent.length === 0, `admin-address PDF purchase: expected zero emails, got ${sent.length}`);
    res = await runWebhook({ id: "cs_pdf_other", email: CUSTOMER, productType: "pdf_book", amountTotal: 1500, discounts: [{ promotion_code: { code: "SAVE10" } }] });
    check(res.status === 200 && sent.length === 1, `other promo PDF purchase: expected 1 email, got ${sent.length}`);
    if (failures === before) ok("PDF purchases: normal/other-promo delivered, ADMINFREE/admin address suppressed");
  }

  // ── 4. generateAndSendReport (admin fast path in unlockPremiumReport) ─────
  console.log("\n=== generateAndSendReport (admin unlock path) ===");
  {
    const before = failures;
    reset();
    let r = await generateAndSendReport("rep-1", "admin@example.test", "Admin");
    check(sent.length === 0 && r.pdfSent === false && r.suppressed === true, `admin address: expected no email and suppressed=true, got ${JSON.stringify({ sent: sent.length, r })}`);
    check(!executed.some((s) => /pdf_sent = TRUE/.test(s)), "admin address: pdf_sent must stay false (no email went out)");
    check(suppressionLines().length === 1 && suppressionLines()[0].includes("reason=admin_email"), `admin address: exactly one admin_email log line, got ${JSON.stringify(suppressionLines())}`);
    reset();
    r = await generateAndSendReport("rep-1", CUSTOMER, "Customer");
    check(sent.length === 1 && r.pdfSent === true && !r.suppressed, `normal address: expected the email and pdfSent=true, got ${JSON.stringify({ sent: sent.length, r })}`);
    reset();
    r = await generateAndSendReport("rep-1", CUSTOMER, "Customer", { suppressEmail: true });
    check(sent.length === 0 && r.suppressed === true, "explicit suppressEmail: no email");
    assertNoAddressesInSuppressionLogs("generateAndSendReport");
    if (failures === before) ok("generateAndSendReport: admin suppressed, customer unchanged");
  }

  // ── 5. every report sender is guarded (call sites the harness cannot execute) ──
  console.log("\n=== structural guard: every report-related sender is guarded ===");
  {
    const before = failures;
    const root = process.cwd();
    const skipDir = new Set(["node_modules", ".next", ".git", ".claude", "scripts", "scratch", "temp_tests", "emails", "db", "prisma"]);
    const files: string[] = [];
    (function walk(dir: string) {
      for (const name of readdirSync(dir)) {
        if (skipDir.has(name)) continue;
        const full = path.join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(name)) files.push(full);
      }
    })(root);

    // Files that send mail but are NOT report emails (auth, contact form, agent-portal, subscriptions), and the
    // low-level senders that are guarded by every one of their callers (checked below).
    const NOT_REPORT_EMAIL: Record<string, string> = {
      "app/api/contact/route.ts": "contact form",
      "lib/email/magic-link.ts": "authentication",
      "lib/email/agent-notifications.ts": "agent-portal assignment notice (claim/pool actions)",
      "lib/alerts/check-points-alerts.ts": "points-alert subscriptions",
      "lib/email/pdf-delivery.ts": "low-level sender; every caller is checked below",
      "lib/email/full-check-admin.ts": "low-level sender; every caller is checked below",
      "lib/email/suppression.ts": "the helper itself",
    };
    const GUARDED_SENDERS = /\b(sendPdfDeliveryEmail|sendFullCheckAdminEmail|sendReportReadyEmail|sendInternalLeadTierEmail|sendPdfLeadAdminEmail|generateAndSendReport|sendPremiumReportReadyEmail)\s*\(/;
    for (const file of files) {
      const rel = path.relative(root, file).split(path.sep).join("/");
      const src = readFileSync(file, "utf8");
      const sendsMail = /\.emails\.send\(/.test(src);
      const callsGuarded = GUARDED_SENDERS.test(src.replace(/(?:async\s+)?function\s+\w+\s*\(/g, "")) && !/export (async )?function (sendPdfDeliveryEmail|sendFullCheckAdminEmail)/.test(src);
      if (!sendsMail && !callsGuarded) continue;
      if (NOT_REPORT_EMAIL[rel]) continue;
      if (!/from ["']@\/lib\/email\/suppression["']/.test(src) && !/from ["'](\.\.\/)+lib\/email\/suppression["']/.test(src)) {
        check(false, `${rel} sends report-related mail but does not use shouldSuppressReportEmails (add it, or list it in NOT_REPORT_EMAIL with a reason)`);
      } else if (!/shouldSuppressReportEmails\(/.test(src)) {
        check(false, `${rel} imports the suppression helper but never calls it`);
      }
    }
    if (failures === before) ok("all report-related senders call the suppression helper");
  }

  console.log = realLog;
  check(networkAttempts === 0, `no network access may be attempted (attempts: ${networkAttempts})`);
  if (failures > 0) {
    console.error(`\n❌ test-email-suppression FAILED (${failures} problem${failures === 1 ? "" : "s"})`);
    process.exit(1);
  }
  console.log("\n✅ test-email-suppression passed (no email sent, no Stripe key used, no database touched)");
  process.exit(0);
}

main().catch((err) => {
  console.error("test-email-suppression crashed:", err);
  process.exit(1);
});
