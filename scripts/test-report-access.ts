/**
 * Report access control -- the real server action, PDF route and result page, with only the request context stubbed
 * (cookies, the NextAuth session, Prisma, and fetch to /api/checkout): nothing touches a network or database.
 *
 *   1. canAccessReport / access tokens (pure).
 *   2. unlockPremiumReport: a TYPED admin email without a session does NOT unlock (Stripe redirect, no UPDATE);
 *      a signed admin cookie or a NextAuth ADMIN session unlocks in place -- keeping the report's own email.
 *   3. GET /api/reports/<id>/pdf: 404 without authorization (no token, wrong token, another report's token, locked,
 *      other user's session); 200 PDF with the report's token, an admin cookie, or the owner's session.
 *   4. The result page renders no report data (the access-required view) for an unauthorized visitor.
 */
import { cookieJar, setNextAuthSession, signOutAll } from "./lib/stub-request-context";

process.env.ADMIN_DASHBOARD_PASSWORD = "test-admin-password";
process.env.ADMIN_DASHBOARD_SECRET = "test-admin-secret";
process.env.AUTH_SECRET = "test-auth-secret-for-report-tokens";
process.env.ADMIN_EMAILS = "owner-admin@example.com";
process.env.KNOWN_TEST_EMAILS = "";
process.env.ENABLE_TRANSACTIONAL_EMAILS = "false";
process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/dummy";
delete process.env.RESEND_API_KEY;

// In-memory user_reports.
type Row = Record<string, unknown> & { id: string; email: string; is_unlocked: boolean };
const rows = new Map<string, Row>();
const updates: unknown[][] = [];
(globalThis as { prisma?: unknown }).prisma = {
  $queryRawUnsafe: async (_sql: string, id: string) => (rows.has(id) ? [rows.get(id)] : []),
  $executeRawUnsafe: async (sql: string, ...args: unknown[]) => {
    updates.push([sql, ...args]);
    if (/SET\s+email = \$1/.test(sql)) {
      const row = rows.get(String(args[5]));
      if (row) Object.assign(row, { email: args[0], is_unlocked: true, unlock_method: args[2] });
    }
    return 1;
  },
  $disconnect: async () => undefined,
  stateAllocation: { findUnique: async () => null, findFirst: async () => null },
  occupation: { findUnique: async () => null, findFirst: async () => null },
  roundCutoff: { findUnique: async () => null, findFirst: async () => null },
};
// /api/checkout (called server-side by the unlock action) -> a stub Stripe URL. Anything else must not be fetched.
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.endsWith("/api/checkout")) return new Response(JSON.stringify({ url: "https://checkout.stripe.com/c/pay/cs_test_stub" }), { status: 200, headers: { "content-type": "application/json" } });
  throw new Error(`unexpected fetch in test: ${url}`);
}) as typeof fetch;
void realFetch;

let failures = 0;
const ok = (m: string) => console.log(`  ✅ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ❌ ${m}`);
};
const check = (cond: boolean, pass: string, failMsg: string) => (cond ? ok(pass) : fail(failMsg));

async function main() {
  const { runReadinessEngine } = await import("../src/lib/readiness-engine");
  const access = await import("../lib/reports/report-access");
  const { refreshAdminSession } = await import("../lib/admin-auth");
  const { unlockPremiumReport } = await import("../app/[locale]/(main)/full-check/actions");
  const { GET } = await import("../app/api/reports/[reportId]/pdf/route");
  const ResultPage = (await import("../app/[locale]/(main)/full-check/result/page")).default;
  const { ReportAccessRequired } = await import("../app/[locale]/(main)/full-check/result/report-access-required");

  const report = runReadinessEngine({ locale: "en", country: "AU", mainGoal: "Skilled migration 189", currentCountry: "IN", passportCountry: "IN", age: "30", occupation: "Civil Engineer 233211", occupationConfirmed: "yes", englishLevel: "proficient", qualificationLevel: "Bachelor's Degree", migrationGoals: ["direct_pr"], offshoreExperienceYears: 5 } as never);
  const seed = (id: string, email: string, unlocked: boolean) =>
    rows.set(id, { id, email, locale: "en", report_json: JSON.parse(JSON.stringify(report)), input_json: {}, agent_id: null, is_unlocked: unlocked, full_name: "Customer", preview_data: null });
  const signOut = () => signOutAll();
  void cookieJar;
  const unlockForm = (reportId: string, email: string) => {
    const fd = new FormData();
    fd.set("reportId", reportId); fd.set("email", email); fd.set("fullName", "Anyone"); fd.set("unlockMethod", "payment");
    return fd;
  };
  const pdf = (reportId: string, token?: string) => GET(new Request(`http://localhost/api/reports/${reportId}/pdf${token ? `?t=${encodeURIComponent(token)}` : ""}`), { params: Promise.resolve({ reportId }) });

  console.log("==================== (1) access tokens / canAccessReport (pure) ====================");
  {
    const A = "11111111-1111-4111-8111-111111111111";
    const B = "22222222-2222-4222-8222-222222222222";
    const tA = access.reportAccessToken(A)!;
    check(!!tA && tA.length >= 40, "token issued (base64url HMAC)", "no token");
    check(access.isValidReportAccessToken(A, tA) && !access.isValidReportAccessToken(B, tA) && !access.isValidReportAccessToken(A, tA.slice(0, -1) + (tA.endsWith("A") ? "B" : "A")), "valid only for its own report, and not when altered", "token validation wrong");
    check(!access.isValidReportAccessToken(A, tA, null) && access.reportAccessToken(A, null) === null, "no secret configured -> no token issued or accepted (fail closed)", "fails open without a secret");
    const none = { isAdmin: false, sessionEmail: null };
    check(!access.canAccessReport({ requester: none, reportId: A, reportEmail: "c@example.com" }), "no admin, no token, no session -> denied", "anonymous allowed");
    check(access.canAccessReport({ requester: { isAdmin: true }, reportId: A, reportEmail: "c@example.com" }), "admin session -> allowed", "admin denied");
    check(access.canAccessReport({ requester: { isAdmin: false, sessionEmail: "C@Example.com" }, reportId: A, reportEmail: "c@example.com" }) && !access.canAccessReport({ requester: { isAdmin: false, sessionEmail: "x@example.com" }, reportId: A, reportEmail: "c@example.com" }), "signed-in owner allowed, other signed-in user denied", "session-email rule wrong");
  }

  console.log("\n==================== (2) unlockPremiumReport: typed admin email vs admin session ====================");
  {
    const id = "33333333-3333-4333-8333-333333333333";
    seed(id, "customer@example.com", false);
    signOut(); updates.length = 0;
    const typed = await unlockPremiumReport({ status: "idle" }, unlockForm(id, "owner-admin@example.com"));
    check(typed.status === "redirect" && /checkout\.stripe\.com/.test(typed.redirectUrl ?? "") && updates.length === 0 && rows.get(id)!.is_unlocked === false,
      "typed ADMIN_EMAILS address, no session -> Stripe redirect, report NOT unlocked, no UPDATE",
      `typed admin email: status ${typed.status}, updates ${updates.length}, unlocked ${rows.get(id)!.is_unlocked}`);

    setNextAuthSession({ user: { id: "u1", email: "owner-admin@example.com", role: "USER" } });
    const userRole = await unlockPremiumReport({ status: "idle" }, unlockForm(id, "owner-admin@example.com"));
    check(userRole.status === "redirect" && rows.get(id)!.is_unlocked === false, "signed-in USER with an admin email -> still Stripe, not unlocked", `USER role unlocked (${userRole.status})`);

    signOut(); updates.length = 0;
    await refreshAdminSession();
    const admin = await unlockPremiumReport({ status: "idle" }, unlockForm(id, "whatever@example.com"));
    const row = rows.get(id)!;
    check(admin.status === "success" && row.is_unlocked === true && row.email === "customer@example.com" && !!admin.accessToken,
      "signed admin cookie -> unlocked in place, report keeps its own email (typed one ignored), access token returned",
      `admin cookie: status ${admin.status}, unlocked ${row.is_unlocked}, email ${row.email}`);

    const id2 = "44444444-4444-4444-8444-444444444444";
    seed(id2, "customer2@example.com", false);
    signOut();
    setNextAuthSession({ user: { id: "a1", email: "someone@example.com", role: "ADMIN" } });
    const nextAuthAdmin = await unlockPremiumReport({ status: "idle" }, unlockForm(id2, "customer2@example.com"));
    check(nextAuthAdmin.status === "success" && rows.get(id2)!.is_unlocked === true, "NextAuth ADMIN session -> unlocked", `NextAuth admin: ${nextAuthAdmin.status}`);
    signOut();
  }

  console.log("\n==================== (3) GET /api/reports/<id>/pdf authorization ====================");
  {
    const unlocked = "55555555-5555-4555-8555-555555555555";
    const locked = "66666666-6666-4666-8666-666666666666";
    const other = "77777777-7777-4777-8777-777777777777";
    seed(unlocked, "owner@example.com", true);
    seed(locked, "owner@example.com", false);
    const token = access.reportAccessToken(unlocked)!;
    signOut();
    const cases: Array<[string, () => Promise<Response>, number]> = [
      ["unlocked, no token, no session", () => pdf(unlocked), 404],
      ["unlocked, wrong token", () => pdf(unlocked, "not-a-real-token"), 404],
      ["unlocked, another report's token", () => pdf(unlocked, access.reportAccessToken(other)!), 404],
      ["locked, its own valid token", () => pdf(locked, access.reportAccessToken(locked)!), 404],
      ["unknown report", () => pdf(other, access.reportAccessToken(other)!), 404],
      ["unlocked, its own token", () => pdf(unlocked, token), 200],
    ];
    for (const [label, run, want] of cases) {
      const res = await run();
      const isPdf = (res.headers.get("content-type") ?? "").includes("application/pdf");
      check(res.status === want && (want !== 200 || isPdf), `${label} -> ${want}`, `${label}: HTTP ${res.status} (expected ${want})`);
    }
    setNextAuthSession({ user: { id: "u2", email: "intruder@example.com", role: "USER" } });
    check((await pdf(unlocked)).status === 404, "another signed-in user, no token -> 404", "other user got the PDF");
    setNextAuthSession({ user: { id: "u3", email: "OWNER@example.com", role: "USER" } });
    check((await pdf(unlocked)).status === 200, "the owner's own NextAuth session -> 200", "owner session denied");
    signOut();
    await refreshAdminSession();
    check((await pdf(unlocked)).status === 200, "admin cookie, no token -> 200", "admin denied");
    signOut();
  }

  console.log("\n==================== (4) result page: no report data without authorization ====================");
  {
    const id = "55555555-5555-4555-8555-555555555555";
    signOut();
    const anon = (await ResultPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ reportId: id }) })) as { type: unknown; props: Record<string, unknown> };
    check(anon.type === ReportAccessRequired && !("report" in anon.props) && !("email" in anon.props),
      "anonymous visitor with only the report id -> access-required view, no report and no email passed",
      "result page rendered report data without authorization");
    const withToken = (await ResultPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ reportId: id, t: access.reportAccessToken(id)! }) })) as { type: unknown; props: Record<string, unknown> };
    check(withToken.type !== ReportAccessRequired && typeof withToken.props.downloadHref === "string" && String(withToken.props.downloadHref).includes("?t="),
      "with the report's token -> full view, tokenized download link",
      "token holder was refused");
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("test-report-access crashed:", err);
  process.exit(1);
});
