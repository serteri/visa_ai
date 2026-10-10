/**
 * Paid checkout ON (the default): an authenticated admin session creates a new report and unlocks it without Stripe, in the same browser, from the
 * normal form and unlock action; everyone else is sent to Stripe Checkout. The REAL submit and unlock actions, with only the edges stubbed (cookies,
 * the NextAuth session, Prisma in memory, the email provider as a recorder, fetch): nothing touches a network or a database.
 *
 *   1. non-admin: a new report sends the customer preview email; the unlock asks /api/checkout for a Stripe session and returns its URL; the report
 *      stays locked; no promotion code or admin shortcut exists for them (a typed admin address does not unlock);
 *   2. admin session (NextAuth ADMIN, then the signed admin cookie): the same form creates a report with NO customer / internal / agent email; the unlock
 *      returns the report and its access token in the same browser, never calls /api/checkout, creates no Stripe session, needs no promotion code,
 *      records the unlock as admin_free. Emails depend on the RECIPIENT address only: a non-listed customer is emailed even in an admin session; a listed address is not;
 *   3. the checkout route itself still demands payment from a non-admin (paid flag on) and the PDF route answers an admin for the unlocked report.
 *
 *   npx tsx scripts/test-admin-unlock.ts
 */
import "./lib/no-live-stripe"; // FIRST: no Stripe variables, no route to stripe.com
import { cookieJar, setNextAuthSession, signOutAll } from "./lib/stub-request-context";

delete process.env.READINESS_REPORT_PAID_CHECKOUT_ENABLED; // the production default: paid checkout ON
process.env.AUTH_SECRET = "test-auth-secret-for-admin-unlock";
process.env.ADMIN_EMAILS = "owner-admin@example.com";
process.env.KNOWN_TEST_EMAILS = "";
process.env.ADMIN_DASHBOARD_PASSWORD = "test-admin-password";
process.env.RESEND_API_KEY = "re_test_stub_not_a_real_key";
process.env.FROM_EMAIL = "LogiVisa Test <noreply@example.test>";
process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects
process.env.STRIPE_SECRET_KEY = ""; // An empty string, not `delete`: Prisma's .env load would put a deleted key back (scripts/lib/no-live-stripe.ts).
delete process.env.ENABLE_TRANSACTIONAL_EMAILS;
delete process.env.SIMULATE_EMAIL_DELIVERY;

type Row = Record<string, unknown> & { id: string; email: string; is_unlocked: boolean };
const rows = new Map<string, Row>();
let newId = "";
(globalThis as { prisma?: unknown }).prisma = {
  $queryRawUnsafe: async (sql: string, ...args: unknown[]) => {
    if (/INSERT INTO user_reports/i.test(sql)) {
      newId = `00000000-0000-4000-8000-${String(rows.size + 1).padStart(12, "0")}`;
      return [{ id: newId }];
    }
    if (/COUNT\(\*\)/.test(sql)) return [{ n: 0 }];
    const id = String(args[0]);
    return rows.has(id) ? [rows.get(id)] : [];
  },
  $executeRawUnsafe: async (sql: string, ...args: unknown[]) => {
    if (/SET\s+email = \$1/.test(sql)) {
      const row = rows.get(String(args[5]));
      if (row) Object.assign(row, { email: args[0], is_unlocked: true, unlock_method: args[2], payment_status: args[3] });
    }
    if (/SET pdf_sent = TRUE/.test(sql)) {
      const row = rows.get(String(args[0]));
      if (row) row.pdf_sent = true;
    }
    return 1;
  },
  $disconnect: async () => undefined,
  userReport: { create: async () => ({ id: "x" }), findFirst: async () => null, findMany: async () => [], count: async () => 0 },
  agent: { findFirst: async () => null, findUnique: async () => null },
  stateAllocation: { findUnique: async () => null, findFirst: async () => null },
  occupation: { findUnique: async () => null, findFirst: async () => null },
  roundCutoff: { findUnique: async () => null, findFirst: async () => null },
  stateIntelligence: { findMany: async () => [] },
  stateNominationConfig: { findMany: async () => [] },
};

let checkoutCalls = 0;
let stripeCalls = 0;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (/\/api\/checkout$/.test(url)) {
    checkoutCalls++;
    void init;
    return new Response(JSON.stringify({ url: "https://checkout.stripe.test/c/pay_cs_test_123" }), { status: 200, headers: { "content-type": "application/json" } });
  }
  if (/stripe\.com/.test(url)) stripeCalls++;
  throw new Error(`network access is forbidden in test-admin-unlock: ${url}`);
}) as typeof fetch;

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};

type Sent = { to: string[]; subject: string };

async function main() {
  const sent: Sent[] = [];
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resend } = require("resend") as typeof import("resend");
  (Object.getPrototypeOf(new Resend("re_stub").emails) as { send: unknown }).send = async (p: { to: string | string[]; subject: string }) => {
    sent.push({ to: Array.isArray(p.to) ? p.to : [p.to], subject: p.subject });
    return { data: { id: "stub" }, error: null };
  };

  const { runReadinessEngine } = await import("../src/lib/readiness-engine");
  const { refreshAdminSession } = await import("../lib/admin-auth");
  const { submitFullCheckWaitlist, unlockPremiumReport } = await import("../app/[locale]/(main)/full-check/actions");
  const { REVIEW_PERSONAS } = await import("./render-persona-pdfs");
  const base = REVIEW_PERSONAS["reference-se-au"];

  const report = JSON.parse(JSON.stringify(runReadinessEngine({ ...base, locale: "en", targetVisa: "491", preferredPathway: "491" })));
  const seed = (id: string, email: string, locale: "en" | "tr" | "zh-Hans") =>
    rows.set(id, { id, email, locale, report_json: report, input_json: { occupation: String(base.occupation), age: "30", passportCountry: "TR", currentCountry: "AU", targetVisa: "491" }, agent_id: null, is_unlocked: false, full_name: "Customer", preview_data: null, created_at: "2026-10-08T00:00:00Z", source: "full_check" } as Row);
  const submitForm = (email: string, locale: string) => {
    const f = new FormData();
    f.set("email", email);
    f.set("fullName", "Customer");
    f.set("targetCountry", "AU");
    f.set("routeLocale", locale);
    f.set("currentCountry", "Australia");
    f.set("passportCountry", "Turkey");
    f.set("age", "30");
    f.set("occupation", String(base.occupation));
    f.set("visaInterest", "491");
    f.set("qualificationLevel", "Bachelor");
    f.set("englishLevel", "superior");
    f.set("sponsorOrFamily", "Single");
    f.set("annualSalaryAud", "90000");
    f.set("targetVisa", "491");
    f.set("employerSponsorship", "none");
    f.set("residenceState", "NSW");
    return f;
  };
  const unlockForm = (reportId: string, email: string) => {
    const f = new FormData();
    f.set("reportId", reportId);
    f.set("email", email);
    f.set("fullName", "Customer");
    f.set("unlockMethod", "payment");
    return f;
  };
  const flush = () => new Promise((r) => setTimeout(r, 50));

  for (const locale of ["en", "tr", "zh-Hans"] as const) {
    console.log(`\n==================== [${locale}] ====================`);
    const customer = `customer-${locale}@example.org`; // not on any admin / test list

    console.log("1. non-admin");
    signOutAll();
    sent.length = 0;
    const made = await submitFullCheckWaitlist({ status: "idle" }, submitForm(customer, locale));
    await flush();
    check(made.status === "success" && !!made.reportId, "a new report is created", JSON.stringify(made).slice(0,400));
    const id = made.reportId ?? newId;
    seed(id, customer, locale);
    check(sent.some((m) => m.to.includes(customer)), "the customer gets the preview email");
    checkoutCalls = 0;
    const paid = await unlockPremiumReport({ status: "idle" }, unlockForm(id, customer));
    check(paid.status === "redirect" && paid.redirectUrl === "https://checkout.stripe.test/c/pay_cs_test_123" && checkoutCalls === 1, "unlock -> Stripe Checkout (the /api/checkout session URL)", JSON.stringify(paid).slice(0, 160));
    check(rows.get(id)!.is_unlocked === false && !paid.unlocked && !paid.accessToken, "the report stays locked and nothing is returned");
    const typedAdmin = await unlockPremiumReport({ status: "idle" }, unlockForm(id, "owner-admin@example.com"));
    check(typedAdmin.status !== "success" || !typedAdmin.unlocked, "a typed admin address is not a credential: still no report", typedAdmin.status);
    checkoutCalls = 0;

    console.log("\n2a. admin session (NextAuth ADMIN)");
    signOutAll();
    setNextAuthSession({ user: { id: "a1", email: "admin@example.com", role: "ADMIN" } });
    sent.length = 0;
    const adminMade = await submitFullCheckWaitlist({ status: "idle" }, submitForm(customer, locale));
    await flush();
    check(adminMade.status === "success" && !!adminMade.reportId, "the normal form creates a new report");
    check(sent.some((m) => m.to.includes(customer)), "an admin session does NOT suppress the preview email to a non-listed customer", JSON.stringify(sent));
    const aid = adminMade.reportId ?? newId;
    seed(aid, customer, locale);
    checkoutCalls = 0;
    stripeCalls = 0;
    const unlocked = await unlockPremiumReport({ status: "idle" }, unlockForm(aid, customer));
    await flush();
    check(unlocked.status === "success" && unlocked.unlocked === true && !("report" in unlocked) && !!unlocked.accessToken, "the unlock returns an open flag and the access token (never the report) in the same browser", JSON.stringify({ s: unlocked.status, m: unlocked.message }));
    check(checkoutCalls === 0 && stripeCalls === 0 && !unlocked.redirectUrl, "no /api/checkout request, no Stripe session, no redirect, no promotion code");
    check(rows.get(aid)!.is_unlocked === true && rows.get(aid)!.unlock_method === "admin_free" && rows.get(aid)!.payment_status === "admin_free", "the report is unlocked and recorded as admin_free");
    check(sent.some((m) => m.to.includes(customer) && /Information Report|Bilgi Raporu|信息报告/.test(m.subject)), "the unlock emails the report link to the non-listed customer (an admin session suppresses nothing)", JSON.stringify(sent));
    check(sent.every((m) => m.to.includes(customer)), "nothing goes to anyone else", JSON.stringify(sent));

    console.log("\n2b. admin session (signed admin cookie)");
    signOutAll();
    await refreshAdminSession();
    check(cookieJar.size === 1, "the admin cookie is set");
    sent.length = 0;
    const cookieMade = await submitFullCheckWaitlist({ status: "idle" }, submitForm(customer, locale));
    await flush();
    const cid = cookieMade.reportId ?? newId;
    seed(cid, customer, locale);
    checkoutCalls = 0;
    const cookieUnlocked = await unlockPremiumReport({ status: "idle" }, unlockForm(cid, customer));
    await flush();
    check(cookieMade.status === "success" && cookieUnlocked.status === "success" && cookieUnlocked.unlocked === true && checkoutCalls === 0 && sent.some((m) => m.to.includes(customer)) && rows.get(cid)!.unlock_method === "admin_free", "the admin cookie: new report, unlock without Stripe, customer still emailed");

    console.log("\n2c. admin session + a LISTED recipient address: suppressed by the address");
    const listed = "owner-admin@example.com";
    sent.length = 0;
    const lm = await submitFullCheckWaitlist({ status: "idle" }, submitForm(listed, locale));
    await flush();
    const lid = lm.reportId ?? newId;
    seed(lid, listed, locale);
    await unlockPremiumReport({ status: "idle" }, unlockForm(lid, listed));
    await flush();
    check(sent.length === 0, "listed address: no email", JSON.stringify(sent));
    signOutAll();
  }

  console.log("\n3. the checkout route and the PDF for an admin");
  {
    process.env.STRIPE_SECRET_KEY = "";
    const { NextRequest } = await import("next/server");
    const { POST } = await import("../app/api/checkout/route");
    const res = await POST(new NextRequest("http://localhost/api/checkout", { method: "POST", body: JSON.stringify({ productType: "premium", email: "x@example.org" }), headers: { "content-type": "application/json" } }));
    check(res.status !== 403, "the checkout route is open for the premium product (paid flag on): a non-admin must pay", String(res.status));
    const aid = [...rows.values()].find((r) => r.unlock_method === "admin_free")?.id;
    setNextAuthSession({ user: { id: "a1", email: "admin@example.com", role: "ADMIN" } });
    const { GET } = await import("../app/api/reports/[reportId]/pdf/route");
    const pdf = await GET(new Request(`http://localhost/api/reports/${aid}/pdf`), { params: Promise.resolve({ reportId: String(aid) }) });
    check(pdf.status === 200 && /pdf/.test(pdf.headers.get("content-type") ?? ""), "an admin session downloads the PDF of the admin-unlocked report", String(pdf.status));
    signOutAll();
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
