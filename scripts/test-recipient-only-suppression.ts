/**
 * Report emails are suppressed ONLY by the recipient address (ADMIN_EMAILS / KNOWN_TEST_EMAILS) or the one coupon id in ADMIN_FREE_COUPON_ID.
 * Never by a 100% coupon, a zero-amount session, another promotion code, a hard-coded coupon name, or the browser's admin session.
 * Runs the REAL Stripe webhook route and generateAndSendReport with only the edges stubbed (Stripe retrieve, Prisma, Resend, network).
 *
 *   npx tsx scripts/test-recipient-only-suppression.ts
 */
process.env.DATABASE_URL ??= "postgresql://u:p@localhost:5432/d?sslmode=disable";
process.env.RESEND_API_KEY = "re_test_stub_not_a_real_key";
process.env.STRIPE_SECRET_KEY = "sk_test_stub_not_a_real_key";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_stub";
process.env.FROM_EMAIL = "LogiVisa Test <noreply@example.test>";
process.env.FULL_CHECK_NOTIFICATION_EMAIL = "internal-notify@example.test";
process.env.NEXT_PUBLIC_BASE_URL = "https://example.test";
process.env.ADMIN_EMAILS = ' serter@logivisa.com , "Test@Example.com" ';
process.env.KNOWN_TEST_EMAILS = "jane.doe@example.com";
delete process.env.ADMIN_FREE_COUPON_ID;
delete process.env.SIMULATE_EMAIL_DELIVERY;
delete process.env.ENABLE_TRANSACTIONAL_EMAILS;

export {};
let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};

async function main() {
  const sent: { to: string[]; subject: string }[] = [];
  const logs: string[] = [];
  let providerError = false;
  for (const level of ["log", "info", "warn", "error"] as const) {
    const real = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      logs.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a, (_k, v) => (v instanceof Error ? v.message : v)))).join(" "));
      real(...args);
    };
  }
  globalThis.fetch = (async () => {
    throw new Error("network forbidden");
  }) as typeof fetch;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resend } = require("resend") as typeof import("resend");
  (Object.getPrototypeOf(new Resend("re_stub").emails) as { send: unknown }).send = async (p: { to: string | string[]; subject: string }) => {
    if (providerError) return { data: null, error: { name: "validation_error", message: "rejected (test)" } };
    sent.push({ to: Array.isArray(p.to) ? p.to : [p.to], subject: p.subject });
    return { data: { id: "stub" }, error: null };
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = (require("stripe") as { default?: typeof import("stripe").default }).default ?? (require("stripe") as typeof import("stripe").default);
  const probe = new Stripe("sk_test_stub");
  const fixtures = new Map<string, unknown>();
  (Object.getPrototypeOf(probe.checkout.sessions) as { retrieve: unknown }).retrieve = async (id: string) => fixtures.get(id);
  (Object.getPrototypeOf(probe.promotionCodes) as { retrieve: unknown }).retrieve = async (id: string) => ({ id, code: "TESTFREE" });

  let reportEmail = "";
  (globalThis as { prisma?: unknown }).prisma = {
    userReport: {
      findUnique: async () => ({ id: "rep-1", email: reportEmail, locale: "en", fullName: "Test Person", source: "full_check", preferredPath: "189", reportJson: {}, inputJson: {} }),
      update: async () => ({}),
    },
    transaction: { findUnique: async () => null, create: async () => ({}) },
    user: { findUnique: async () => null },
    $queryRawUnsafe: async () => [{ id: "rep-1", email: reportEmail, locale: "en", report_json: {}, input_json: {}, agent_id: null, is_unlocked: true, full_name: "Test Person", preview_data: null }],
    $executeRawUnsafe: async () => 0,
    $disconnect: async () => undefined,
  };
  const { POST } = await import("../app/api/stripe/webhook/route");
  const { NextRequest } = await import("next/server");

  let n = 0;
  async function webhook(email: string, opts: { amount?: number; paymentStatus?: string; coupon?: { id: string; name?: string } | null } = {}) {
    sent.length = 0;
    logs.length = 0;
    reportEmail = email;
    const id = `cs_test_${++n}`;
    const amount = opts.amount ?? 3999;
    const session = {
      id,
      object: "checkout.session",
      customer_email: email,
      customer_details: { email, name: "Test Person" },
      amount_total: amount,
      payment_status: opts.paymentStatus ?? (amount === 0 ? "no_payment_required" : "paid"),
      currency: "aud",
      metadata: { productType: "premium", email, assessmentId: "rep-1", reportId: "rep-1", leadId: "rep-1", agentId: "" },
    };
    fixtures.set(id, { ...session, discounts: opts.coupon ? [{ coupon: opts.coupon, promotion_code: "promo_x" }] : [], total_details: { amount_tax: 0, breakdown: { discounts: [], taxes: [] } } });
    const payload = JSON.stringify({ id: `evt_${id}`, object: "event", type: "checkout.session.completed", data: { object: session } });
    const header = probe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
    return POST(new NextRequest("http://localhost/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": header } }));
  }
  const internal = () => sent.filter((s) => s.to.includes("internal-notify@example.test"));
  const customer = (email: string) => sent.filter((s) => s.to.includes(email));
  const logged = (re: RegExp) => logs.some((l) => re.test(l));

  console.log("1. paid, non-listed address: customer email + PAID admin notification");
  await webhook("cimend79@hotmail.com");
  check(customer("cimend79@hotmail.com").length === 1 && internal().length === 1, "both emails are sent", JSON.stringify(sent));
  check(logged(/PAID admin notification sent/) && logged(/pdfSent=true/), "the log says both were sent");

  console.log("2. 100% promotion code TESTFREE, zero amount, non-listed address (incognito: no admin session)");
  await webhook("cimend79@hotmail.com", { amount: 0, coupon: { id: "TESTFREE_COUPON", name: "TESTFREE" } });
  check(customer("cimend79@hotmail.com").length === 1 && internal().length === 1, "customer email AND PAID admin notification are sent", JSON.stringify(sent));

  console.log("3. a coupon NAMED ADMINFREE (hard-coded name) no longer suppresses");
  await webhook("cimend79@hotmail.com", { amount: 0, coupon: { id: "AdminFree", name: "ADMINFREE" } });
  check(customer("cimend79@hotmail.com").length === 1 && internal().length === 1, "sent: no code depends on the ADMINFREE name", JSON.stringify(sent));

  console.log("4. listed addresses (ADMIN_EMAILS / KNOWN_TEST_EMAILS, case-insensitive, quotes and spaces ignored) are suppressed, with the reason logged");
  for (const addr of ["serter@logivisa.com", "SERTER@LogiVisa.com", "test@example.com", "jane.doe@example.com"]) {
    await webhook(addr);
    check(sent.length === 0, `${addr}: no email at all`, JSON.stringify(sent));
    check(logged(/\[email-suppression\] suppressed reason=admin_email sender=stripe_webhook_admin_notification/) && logged(/PAID admin notification NOT sent .*reason=/) && logged(/customerEmailSkipped reason=customer_address_listed/) && logged(/\[webhook-summary\] .*paid_admin_notification=skipped:customer_address_listed customer_email=skipped:customer_address_listed/), `${addr}: every skip logs its reason`);
  }

  console.log("5. the one configured coupon id (ADMIN_FREE_COUPON_ID) may suppress; any other coupon may not");
  process.env.ADMIN_FREE_COUPON_ID = "owner_free_coupon";
  await webhook("cimend79@hotmail.com", { amount: 0, coupon: { id: "OWNER_FREE_COUPON" } });
  check(sent.length === 0 && logged(/reason=admin_promo/), "the configured coupon id suppresses (reason logged)", JSON.stringify(sent));
  await webhook("cimend79@hotmail.com", { amount: 0, coupon: { id: "TESTFREE_COUPON", name: "TESTFREE" } });
  check(customer("cimend79@hotmail.com").length === 1 && internal().length === 1, "another 100% coupon still sends both");
  delete process.env.ADMIN_FREE_COUPON_ID;

  console.log("6. every skip or failure logs a reason");
  process.env.ENABLE_TRANSACTIONAL_EMAILS = "false";
  await webhook("cimend79@hotmail.com");
  check(logged(/customerEmailSkipped reason=email_delivery_disabled/), "ENABLE_TRANSACTIONAL_EMAILS=false -> reason=email_delivery_disabled");
  delete process.env.ENABLE_TRANSACTIONAL_EMAILS;
  providerError = true;
  await webhook("cimend79@hotmail.com");
  check(logged(/customerEmailSkipped reason=provider_error/) && logged(/PAID admin notification FAILED .*reason=provider_error/), "provider rejection -> reason=provider_error for the customer email and the admin notification");
  providerError = false;
  const key = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  await webhook("cimend79@hotmail.com");
  check(logged(/PAID admin notification NOT sent .*reason=resend_api_key_missing/), "missing key -> reason=resend_api_key_missing for the admin notification");
  process.env.RESEND_API_KEY = key;

  console.log("7. generateAndSendReport decides on the recipient only (the report's own address)");
  const { generateAndSendReport } = await import("../lib/services/report-service");
  sent.length = 0;
  reportEmail = "cimend79@hotmail.com";
  const a = await generateAndSendReport("rep-1", "cimend79@hotmail.com", "Test");
  check(a.pdfSent === true && customer("cimend79@hotmail.com").length === 1, "non-listed recipient: sent");
  sent.length = 0;
  reportEmail = "serter@logivisa.com";
  const b = await generateAndSendReport("rep-1", "serter@logivisa.com", "Test");
  check(b.pdfSent === false && b.skippedReason === "recipient_listed" && sent.length === 0, "listed recipient: suppressed with skippedReason=recipient_listed");

  console.log("9. the production case: amount_total 0, payment_status 'paid', a promotion code that is NOT the AdminFree coupon, a non-listed customer");
  const zeroPaid = { amount: 0, paymentStatus: "paid", coupon: { id: "TESTFREE_COUPON", name: "TESTFREE" } } as const;
  for (const configured of [undefined, "AdminFree"]) {
    if (configured) process.env.ADMIN_FREE_COUPON_ID = configured;
    else delete process.env.ADMIN_FREE_COUPON_ID;
    await webhook("cimend79@hotmail.com", zeroPaid);
    const tag = `ADMIN_FREE_COUPON_ID=${configured ?? "(unset)"}`;
    check(customer("cimend79@hotmail.com").length === 1, `${tag}: the customer email is sent`, JSON.stringify(sent));
    check(internal().length === 1, `${tag}: the PAID admin notification is sent`, JSON.stringify(sent));
    check(logged(/PAID admin notification sent for report/) && logged(/\[webhook-summary\] .*paid_admin_notification=sent customer_email=sent/), `${tag}: the log says sent / sent`);
    check(!logs.some((l) => /\[email-suppression\]|caller_suppressed|customerEmailSkipped/.test(l)), `${tag}: nothing was suppressed`);
  }
  delete process.env.ADMIN_FREE_COUPON_ID;

  console.log("10. internal notifications are never silenced by the recipient lists (serter@ is on ADMIN_EMAILS)");
  process.env.ADMIN_NOTIFICATION_EMAIL = "serter@logivisa.com, hello@logivisa.com";
  delete process.env.FULL_CHECK_NOTIFICATION_EMAIL;
  await webhook("cimend79@hotmail.com");
  const adminMail = sent.find((m) => /PAID Assessment Completed/.test(m.subject));
  check(!!adminMail && adminMail.to.includes("serter@logivisa.com") && adminMail.to.includes("hello@logivisa.com"), "PAID notification goes to both addresses of the single env var, though serter@ is on ADMIN_EMAILS", JSON.stringify(sent));
  const { shouldSkipInternalNotification } = await import("../lib/email/suppression");
  check(shouldSkipInternalNotification({ email: "cimend79@hotmail.com" }, "t") === false, "a non-listed customer never skips an internal notification");
  check(shouldSkipInternalNotification({ email: "serter@logivisa.com" }, "t") === true, "only a listed CUSTOMER address skips it (the owner's own tests)");
  const { sendInternalLeadTierEmail } = await import("../lib/email/quick-check-emails");
  sent.length = 0;
  const leadSent = await sendInternalLeadTierEmail({ tier: "Hot", fullName: "Cust", email: "cimend79@hotmail.com", occupationDisplay: "Civil Engineer", country: "AU", preferredPathway: "189", englishLevel: "superior", reportLink: "https://example.test/r" } as never);
  check(leadSent === true && sent.some((m) => m.to.includes("serter@logivisa.com") && m.to.includes("hello@logivisa.com")), "the quick-check lead-tier notice reaches the listed recipients", JSON.stringify(sent));
  const { sendPdfLeadAdminEmail } = await import("../lib/email/pdf-delivery");
  sent.length = 0;
  await sendPdfLeadAdminEmail({ fullName: "C", email: "cimend79@hotmail.com", phone: "", slug: "australia-guide-2026", category: "g", delivered: true });
  check(sent.some((m) => m.to.includes("serter@logivisa.com") && m.to.includes("hello@logivisa.com")), "the guide-lead notice reaches the listed recipients", JSON.stringify(sent));
  const { sendContactNotification } = await import("../lib/email/contact");
  sent.length = 0;
  await sendContactNotification({ full_name: "C", email: "cimend79@hotmail.com", message: "hi" });
  check(sent.some((m) => m.to.includes("serter@logivisa.com") && m.to.includes("hello@logivisa.com")), "the contact notice reaches the listed recipients", JSON.stringify(sent));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  const internalSenders = ["lib/email/full-check-admin.ts", "lib/email/quick-check-emails.ts", "lib/email/pdf-delivery.ts", "lib/email/contact.ts", "lib/email/ops-alert.ts"];
  check(internalSenders.every((f) => !/isAdminAllowListedEmail|shouldSuppressReportEmails|shouldSkipInternalNotification|ADMIN_EMAILS/.test(fs.readFileSync(f, "utf8"))), "no internal sender consults the allow-lists about its own recipient");
  delete process.env.ADMIN_NOTIFICATION_EMAIL;
  process.env.FULL_CHECK_NOTIFICATION_EMAIL = "internal-notify@example.test";

  console.log("8. a failed lead persistence is visible: error log + operator alert (throttled), never a silent warn");
  const { sendOpsAlert } = await import("../lib/email/ops-alert");
  sent.length = 0;
  logs.length = 0;
  const first = await sendOpsAlert("leads_table_missing", "A lead was NOT saved: the leads table does not exist.");
  const second = await sendOpsAlert("leads_table_missing", "again");
  check(first.sent && !second.sent && second.skippedReason === "throttled" && internal().length === 1, "one alert email per hour per kind", JSON.stringify(sent));
  check(logs.filter((l) => /\[ops-alert\] leads_table_missing/.test(l)).length >= 2, "every occurrence is logged as an error");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const src = (require("node:fs") as typeof import("node:fs")).readFileSync("app/[locale]/(main)/full-check/actions.ts", "utf8");
  check(/isMissingRelationError\(error, "leads"\)[\s\S]{0,600}sendOpsAlert\("leads_table_missing"/.test(src) && !/console\.warn\("leads table missing/.test(src), "the submit action alerts on a missing leads table (no silent warn)");

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
