/**
 * Free-beta unlock (paid checkout OFF), the REAL unlock action, PDF route and result page, with only the edges stubbed
 * (cookies, the NextAuth session, Prisma in memory, Resend as a recorder): nothing touches a network or database.
 *
 *   1. Session-bound access (pure): signed per report id, tamper-proof, capped, never the emailed-link token.
 *   2. The browser that created a report sees it on screen right after unlock (report + access token returned) and can
 *      download its PDF; another browser (no cookie) gets only the emailed link and nothing in the response; a cookie
 *      for another report grants nothing; the typed email alone is never enough to see the report.
 *   3. Admin notification: the FREE BETA variant (same content as the paid one), once per report, with the day's count;
 *      suppressed for admin / test addresses; a paid report is never re-marked.
 *   4. en / tr / zh-Hans: the messages and the customer email are localised and never claim a payment.
 *
 *   npx tsx scripts/test-free-beta-unlock.ts
 */
import { cookieJar, signOutAll } from "./lib/stub-request-context";

process.env.READINESS_REPORT_PAID_CHECKOUT_ENABLED = "false"; // the sale switched off: the report opens without payment
process.env.AUTH_SECRET = "test-auth-secret-for-free-beta";
process.env.ADMIN_EMAILS = "owner-admin@example.com";
process.env.KNOWN_TEST_EMAILS = "";
process.env.RESEND_API_KEY = "re_test_stub_not_a_real_key";
process.env.FROM_EMAIL = "LogiVisa Test <noreply@example.test>";
process.env.FULL_CHECK_NOTIFICATION_EMAIL = "internal-notify@example.test";
process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects
delete process.env.ENABLE_TRANSACTIONAL_EMAILS;
delete process.env.SIMULATE_EMAIL_DELIVERY;

type Row = Record<string, unknown> & { id: string; email: string; is_unlocked: boolean };
const rows = new Map<string, Row>();
const updates: unknown[][] = [];
let fetches = 0;
(globalThis as { prisma?: unknown }).prisma = {
  $queryRawUnsafe: async (sql: string, id: string) => {
    if (/COUNT\(\*\)/.test(sql)) return [{ n: [...rows.values()].filter((r) => r.unlock_method === "beta_free").length }];
    return rows.has(id) ? [rows.get(id)] : [];
  },
  $executeRawUnsafe: async (sql: string, ...args: unknown[]) => {
    updates.push([sql, ...args]);
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
  stateAllocation: { findUnique: async () => null, findFirst: async () => null },
  occupation: { findUnique: async () => null, findFirst: async () => null },
  roundCutoff: { findUnique: async () => null, findFirst: async () => null },
  stateIntelligence: { findMany: async () => [] },
  stateNominationConfig: { findMany: async () => [] },
};
globalThis.fetch = (async () => {
  fetches++;
  throw new Error("network access is forbidden in test-free-beta-unlock");
}) as typeof fetch;

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};

type Sent = { to: string[]; subject: string; text?: string; html?: string };

async function main() {
  const sent: Sent[] = [];
  const allSent: Sent[] = [];
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resend } = require("resend") as typeof import("resend");
  (Object.getPrototypeOf(new Resend("re_stub").emails) as { send: unknown }).send = async (p: { to: string | string[]; subject: string; text?: string; html?: string }) => {
    const m = { to: Array.isArray(p.to) ? p.to : [p.to], subject: p.subject, text: p.text, html: p.html };
    sent.push(m);
    allSent.push(m);
    return { data: { id: "stub" }, error: null };
  };

  const { runReadinessEngine } = await import("../src/lib/readiness-engine");
  const access = await import("../lib/reports/report-access");
  const session = await import("../lib/reports/report-session");
  const { unlockPremiumReport } = await import("../app/[locale]/(main)/full-check/actions");
  const { GET } = await import("../app/api/reports/[reportId]/pdf/route");
  const ResultPage = (await import("../app/[locale]/(main)/full-check/result/page")).default;
  const { ReportAccessRequired } = await import("../app/[locale]/(main)/full-check/result/report-access-required");

  const report = runReadinessEngine({ locale: "en", country: "AU", mainGoal: "Skilled migration 189", preferredPathway: "189", currentCountry: "IN", passportCountry: "IN", age: "30", occupation: "Civil Engineer 233211", occupationConfirmed: "yes", englishLevel: "proficient", qualificationLevel: "Bachelor's Degree", offshoreExperienceYears: 5, sponsorOrFamily: "Single / No Dependants" });
  const seed = (id: string, email: string, locale: "en" | "tr" | "zh-Hans", unlocked = false, method?: string) =>
    rows.set(id, { id, email, locale, report_json: JSON.parse(JSON.stringify(report)), input_json: { occupation: "Civil Engineer 233211", age: "30", passportCountry: "IN", currentCountry: "IN" }, agent_id: null, is_unlocked: unlocked, unlock_method: method, full_name: "Customer", preview_data: null, created_at: new Date().toISOString() });
  const form = (reportId: string, email: string) => {
    const fd = new FormData();
    fd.set("reportId", reportId);
    fd.set("email", email);
    fd.set("fullName", "Customer");
    fd.set("unlockMethod", "beta_free");
    return fd;
  };
  const ids = { a: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", b: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", c: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", d: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", e: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", f: "ffffffff-ffff-4fff-8fff-ffffffffffff" };
  const browserOf = (...reportIds: string[]) => {
    let v: string | null = null;
    for (const id of reportIds) v = session.withReportSession(v, id);
    return v ?? "";
  };
  const pdf = (reportId: string) => GET(new Request(`http://localhost/api/reports/${reportId}/pdf`), { params: Promise.resolve({ reportId }) });

  console.log("1. session-bound access (pure)");
  {
    const t = session.reportSessionToken(ids.a)!;
    check(!!t && t !== access.reportAccessToken(ids.a), "a session token exists and is not the emailed-link access token");
    const v = session.withReportSession(null, ids.a)!;
    check(session.verifiedReportSessionIds(v).join() === ids.a, "an entry proves access to its own report id");
    check(session.verifiedReportSessionIds(v.replace(/.$/, (c) => (c === "A" ? "B" : "A"))).length === 0, "a tampered token proves nothing");
    check(session.verifiedReportSessionIds(`${ids.b}.${t}`).length === 0, "a token for another report id proves nothing");
    check(session.verifiedReportSessionIds(v, "another-secret").length === 0 && session.withReportSession(null, ids.a, null) === null, "wrong or missing secret: nothing (fail closed)");
    check(session.withReportSession(null, "not-a-uuid") === null, "only a report uuid can be remembered");
    let many: string | null = null;
    for (let i = 0; i < 12; i++) many = session.withReportSession(many, `0000000${(i % 10).toString(16)}-0000-4000-8000-00000000000${i % 10}`);
    check(session.verifiedReportSessionIds(many).length <= session.REPORT_SESSION_MAX_ENTRIES, "at most the newest few reports are remembered");
    check(access.canAccessReport({ requester: { isAdmin: false, sessionReportIds: [ids.a] }, reportId: ids.a, reportEmail: "x@example.com" }) && !access.canAccessReport({ requester: { isAdmin: false, sessionReportIds: [ids.a] }, reportId: ids.b, reportEmail: "x@example.com" }), "canAccessReport: the session grants its own report only");
  }

  console.log("\n2. unlock in the creating browser vs another browser");
  for (const locale of ["en", "tr", "zh-Hans"] as const) {
    const id = locale === "en" ? ids.a : locale === "tr" ? ids.b : ids.c;
    const owner = `customer-${locale}@example.com`;
    seed(id, owner, locale);
    signOutAll();

    // another browser: right email, no cookie -> only the emailed link, nothing returned
    sent.length = 0;
    const other = await unlockPremiumReport({ status: "idle" }, form(id, owner));
    check(other.status === "success" && !other.report && !other.accessToken && !other.redirectUrl, `${locale}: no cookie -> success message only, no report, no token`, JSON.stringify({ s: other.status, r: !!other.report, t: !!other.accessToken }));
    check(rows.get(id)!.is_unlocked === true && rows.get(id)!.unlock_method === "beta_free", `${locale}: the report is unlocked as beta_free`);
    const customerMail = sent.find((m) => m.to.includes(owner));
    check(!!customerMail && !/payment|premium|ödeme|付款|高级/i.test(customerMail.subject) && /Information Report|Bilgi Raporu|信息报告/.test(customerMail.subject), `${locale}: the customer email is Visa Information Report wording, no payment claim`, customerMail?.subject);
    check(!/free beta|ücretsiz beta|免费测试版/i.test(other.message ?? "") && locale === "en" ? /emailed/.test(other.message ?? "") : locale === "tr" ? /gönderildi/.test(other.message ?? "") : /已发送/.test(other.message ?? ""), `${locale}: the message is localised, no beta label`, other.message);
    check(!(await pdf(id)).ok, `${locale}: the other browser cannot download the PDF (404)`);
    const wrong = await unlockPremiumReport({ status: "idle" }, form(id, "someone-else@example.com"));
    check(wrong.status === "error" && !wrong.report, `${locale}: wrong email without a cookie -> error, nothing returned`);

    // the creating browser
    cookieJar.set(session.REPORT_SESSION_COOKIE, browserOf(id));
    const mine = await unlockPremiumReport({ status: "idle" }, form(id, "anything@example.com"));
    check(mine.status === "success" && !!mine.report && !!mine.accessToken && mine.userInput?.email === owner, `${locale}: the creating browser gets the report and its token (typed email ignored, report keeps its own)`);
    check((await pdf(id)).status === 200, `${locale}: the creating browser can download the PDF with the cookie alone`);
    const page = (await ResultPage({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({ reportId: id }) })) as { type: unknown };
    check(page.type !== ReportAccessRequired, `${locale}: the result page opens in the creating browser with no token in the URL`);
    signOutAll();
    const anon = (await ResultPage({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({ reportId: id }) })) as { type: unknown; props: Record<string, unknown> };
    check(anon.type === ReportAccessRequired && !("report" in anon.props), `${locale}: another browser, same URL -> access-required view`);
  }
  {
    seed(ids.d, "owner-d@example.com", "en");
    cookieJar.set(session.REPORT_SESSION_COOKIE, browserOf(ids.a, ids.b));
    const foreign = await unlockPremiumReport({ status: "idle" }, form(ids.d, "typo@example.com"));
    check(foreign.status === "error" && !foreign.report, "a cookie for other reports grants nothing (and the wrong typed email is refused)");
    check(rows.get(ids.d)!.is_unlocked === false, "...and nothing was unlocked");
    signOutAll();
  }

  console.log("\n3. admin notification (free beta variant), counts, idempotency");
  {
    const adminMails = allSent.filter((m) => m.to.includes("internal-notify@example.com") || m.to.includes("internal-notify@example.test"));
    check(adminMails.length === 3 && adminMails.every((m) => /^🆓 FREE BETA Assessment Unlocked: /.test(m.subject)), `one FREE BETA admin notification per report (3 reports, got ${adminMails.length})`, adminMails.map((m) => m.subject).join(" | "));
    check(adminMails.every((m) => /no payment taken/.test(m.text ?? "") && /passport country: IN/.test(m.text ?? "") && /occupation: Civil Engineer/.test(m.text ?? "")), "it carries the same fields as the paid one, labelled free beta");
    check(/free beta unlocks today: 1\b/.test(adminMails[0]?.text ?? "") && /free beta unlocks today: 3\b/.test(adminMails[2]?.text ?? ""), "it carries the day's count (1, then 3)", adminMails.map((m) => (m.text ?? "").match(/free beta unlocks today: \d+/)?.[0]).join(" | "));
    check(!adminMails.some((m) => /PAID/.test(m.subject)), "never labelled PAID");

    sent.length = 0;
    cookieJar.set(session.REPORT_SESSION_COOKIE, browserOf(ids.a));
    const again = await unlockPremiumReport({ status: "idle" }, form(ids.a, "x@example.com"));
    check(again.status === "success" && sent.length === 0, "unlocking an unlocked report again sends no second admin or customer email");
    signOutAll();

    // a paid report is never re-marked
    seed(ids.e, "paid-customer@example.com", "en", true, "payment");
    (rows.get(ids.e) as Row).payment_status = "paid";
    const before = updates.length;
    cookieJar.set(session.REPORT_SESSION_COOKIE, browserOf(ids.e));
    const paid = await unlockPremiumReport({ status: "idle" }, form(ids.e, "paid-customer@example.com"));
    check(paid.status === "success" && !!paid.report && updates.length === before && rows.get(ids.e)!.unlock_method === "payment" && rows.get(ids.e)!.payment_status === "paid", "an already paid report is shown, not re-marked (payment record kept, no UPDATE)");
    signOutAll();

    // suppression for admin / test addresses
    seed(ids.f, "owner-admin@example.com", "en");
    sent.length = 0;
    const sup = await unlockPremiumReport({ status: "idle" }, form(ids.f, "owner-admin@example.com"));
    check(sup.status === "success" && !sent.some((m) => /FREE BETA/.test(m.subject)), "an admin allow-list address gets no admin notification (same suppression as the paid one)");
    signOutAll();
    check(fetches === 0, "no network request was attempted");
  }

  console.log("\n4. source checks");
  {
    const { readFileSync } = await import("node:fs");
    const actions = readFileSync("app/[locale]/(main)/full-check/actions.ts", "utf8");
    check(/await rememberReportSession\(reportRecord\.id\)/.test(actions), "the cookie is set only in the response to the form submission");
    const wh = readFileSync("app/api/stripe/webhook/route.ts", "utf8");
    check(/fullCheckAdminPayload\(record, email\)/.test(wh), "the Stripe webhook uses the same payload builder (one mapping)");
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
