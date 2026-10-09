/**
 * Agent leak fixes (docs/agent-referral-audit.md G2, G3, G4, G15, G6, G11): the REAL checkout route, Stripe webhook, submit action, PDF route,
 * admin assignment and agent-portal data functions, with only the edges stubbed (Prisma in memory, Resend recorder, Stripe, cookies, session).
 *
 *   1. checkout: the agent comes from the report row (approved agents only); a body `agentId` is ignored;
 *   2. webhook: the agent is the report's, never metadata's; pending / rejected / unknown earn nothing; commission is on the GST-exclusive amount
 *      (GST worked out locally); an approved agent gets a post-payment notice with no client details;
 *   3. referral attribution at submit: only an approved agent; NO email to the agent at submit;
 *   4. agent reads: no client details, no report / PDF for agents (paid or not), pending / rejected agents get nothing, by direct URL included;
 *   5. admin assignment: approved agents only; the email carries no client details and is not sent for an unpaid report;
 *   6. AUD labels, GST-exclusive commission wording.
 *
 *   npx tsx scripts/test-agent-leaks.ts
 */
import { readFileSync } from "node:fs";
import { cookieJar, setNextAuthSession, signOutAll } from "./lib/stub-request-context";

delete process.env.READINESS_REPORT_PAID_CHECKOUT_ENABLED;
process.env.AUTH_SECRET = "test-auth-secret-for-agent-leaks";
process.env.ADMIN_EMAILS = "owner-admin@example.com";
process.env.KNOWN_TEST_EMAILS = "";
process.env.RESEND_API_KEY = "re_test_stub_not_a_real_key";
process.env.STRIPE_SECRET_KEY = "sk_test_stub_not_a_real_key";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_stub";
process.env.FROM_EMAIL = "LogiVisa Test <noreply@example.test>";
process.env.FULL_CHECK_NOTIFICATION_EMAIL = "internal-notify@example.test";
process.env.NEXT_PUBLIC_BASE_URL = "https://example.test";
process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable";
delete process.env.ENABLE_TRANSACTIONAL_EMAILS;
delete process.env.SIMULATE_EMAIL_DELIVERY;

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};

type Agent = { id: string; email: string; name: string; role: "AGENT" | "ADMIN"; approvalStatus: string; commissionRate: number | null };
const USERS: Record<string, Agent> = {
  "agent-ok": { id: "agent-ok", email: "ok@agents.example", name: "Ada Approved", role: "AGENT", approvalStatus: "APPROVED", commissionRate: 25 },
  "agent-default": { id: "agent-default", email: "default@agents.example", name: "Dee Default", role: "AGENT", approvalStatus: "APPROVED", commissionRate: null },
  "agent-pending": { id: "agent-pending", email: "pending@agents.example", name: "Pat Pending", role: "AGENT", approvalStatus: "PENDING", commissionRate: 30 },
  "agent-rejected": { id: "agent-rejected", email: "rejected@agents.example", name: "Rex Rejected", role: "AGENT", approvalStatus: "REJECTED", commissionRate: 30 },
  "admin-1": { id: "admin-1", email: "admin@example.com", name: "Admin", role: "ADMIN", approvalStatus: "APPROVED", commissionRate: null },
};

type Report = Record<string, unknown> & { id: string; email: string; agentId: string | null; isUnlocked: boolean; paymentStatus: string; unlockMethod: string | null; fullName: string };
const reports = new Map<string, Report>();
const transactions: Array<Record<string, unknown>> = [];
const insertArgs: unknown[][] = [];
const mkReport = (id: string, agentId: string | null, paid: boolean, source = "full_check"): Report => ({
  id, email: `client-${id}@example.org`, fullName: `Client Name ${id}`, phone: "+61 400 000 000", agentId, source, locale: "en", pointsTier: "Hot", leadTier: "High intent", preferredPath: "189",
  isUnlocked: paid, paymentStatus: paid ? "paid" : "pending", unlockMethod: paid ? "payment" : null, createdAt: new Date("2026-10-01T00:00:00Z"), docStatus: "New", agentNotes: null, market: "GLOBAL",
  reportJson: { secretReportMarker: "REPORT-CONTENT" }, inputJson: { occupation: "Software Engineer 261313", passportCountry: "TR" },
});

function userWhere(where: Record<string, unknown>) {
  return Object.values(USERS).find((u) => (where.id === undefined || u.id === where.id) && (where.role === undefined || u.role === where.role) && (where.approvalStatus === undefined || u.approvalStatus === where.approvalStatus));
}
(globalThis as { prisma?: unknown }).prisma = {
  user: {
    findFirst: async ({ where }: { where: Record<string, unknown> }) => userWhere(where) ?? null,
    findUnique: async ({ where }: { where: { id?: string; email?: string } }) => USERS[where.id ?? ""] ?? Object.values(USERS).find((u) => u.email === where.email) ?? null,
  },
  userReport: {
    findUnique: async ({ where }: { where: { id: string } }) => reports.get(where.id) ?? null,
    findFirst: async ({ where }: { where: { id: string; agentId: string } }) => {
      const r = reports.get(where.id);
      return r && r.agentId === where.agentId ? r : null;
    },
    findMany: async ({ where }: { where: { agentId: string } }) => [...reports.values()].filter((r) => r.agentId === where.agentId),
    count: async () => 0,
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => Object.assign(reports.get(where.id) ?? mkReport(where.id, null, false), data),
    updateMany: async () => ({ count: 0 }),
  },
  transaction: {
    findUnique: async () => null,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      transactions.push(data);
      return data;
    },
    findMany: async ({ where }: { where: { agentId: string } }) =>
      transactions.filter((t) => t.agentId === where.agentId).map((t, i) => ({ id: `tx${i}`, createdAt: new Date(), leadId: t.leadId ?? null, buyerEmail: t.buyerEmail ?? null, totalAmount: t.totalAmount, commissionAmount: t.commissionAmount, lead: { fullName: "SHOULD-NOT-LEAK", email: "leak@example.org" } })),
    aggregate: async () => ({ _sum: { commissionAmount: 0 } }),
  },
  leadNote: { findMany: async () => [], create: async () => ({}) },
  $queryRawUnsafe: async (sql: string, ...args: unknown[]) => {
    if (/INSERT INTO user_reports/i.test(sql)) {
      insertArgs.push(args);
      return [{ id: "00000000-0000-4000-8000-000000000001" }];
    }
    if (/COUNT\(\*\)/.test(sql)) return [{ n: 0 }];
    const r = reports.get(String(args[0]));
    return r ? [{ id: r.id, email: r.email, locale: r.locale, report_json: r.reportJson, input_json: r.inputJson, agent_id: r.agentId, is_unlocked: r.isUnlocked, full_name: r.fullName, preview_data: null, created_at: "2026-10-01T00:00:00Z" }] : [];
  },
  $executeRawUnsafe: async () => 1,
  $disconnect: async () => undefined,
  stateAllocation: { findUnique: async () => null, findFirst: async () => null },
  occupation: { findUnique: async () => null, findFirst: async () => null },
  roundCutoff: { findUnique: async () => null, findFirst: async () => null },
  stateIntelligence: { findMany: async () => [] },
  stateNominationConfig: { findMany: async () => [] },
  agent: { findFirst: async () => null, findUnique: async () => null },
};

async function main() {
  globalThis.fetch = (async () => {
    throw new Error("network forbidden");
  }) as typeof fetch;
  const sent: Array<{ to: string[]; subject: string; text?: string; html?: string }> = [];
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resend } = require("resend") as typeof import("resend");
  (Object.getPrototypeOf(new Resend("re_stub").emails) as { send: unknown }).send = async (p: { to: string | string[]; subject: string; text?: string; html?: string; react?: unknown }) => {
    sent.push({ to: Array.isArray(p.to) ? p.to : [p.to], subject: p.subject, text: p.text, html: p.html ?? JSON.stringify(p.react ?? "") });
    return { data: { id: "stub" }, error: null };
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = (require("stripe") as { default?: typeof import("stripe").default }).default ?? (require("stripe") as typeof import("stripe").default);
  const probe = new Stripe("sk_test_stub");
  const created: Array<{ metadata: Record<string, string> }> = [];
  (Object.getPrototypeOf(probe.checkout.sessions) as { create: unknown; retrieve: unknown }).create = async (params: { metadata: Record<string, string> }) => {
    created.push(params);
    return { id: "cs_test_created", url: "https://checkout.stripe.test/c/pay" };
  };
  const fixtures = new Map<string, unknown>();
  (Object.getPrototypeOf(probe.checkout.sessions) as { retrieve: unknown }).retrieve = async (id: string) => fixtures.get(id);
  const flush = () => new Promise((r) => setTimeout(r, 60));
  const { NextRequest } = await import("next/server");

  // ── 1. checkout ─────────────────────────────────────────────────────────────
  console.log("1. /api/checkout: the agent is the report's (approved only); a body agentId is ignored");
  const { POST: checkout } = await import("../app/api/checkout/route");
  reports.set("r-ok", mkReport("r-ok", "agent-ok", false));
  reports.set("r-pending", mkReport("r-pending", "agent-pending", false));
  reports.set("r-rejected", mkReport("r-rejected", "agent-rejected", false));
  reports.set("r-none", mkReport("r-none", null, false));
  const pay = async (reportId: string, body: Record<string, unknown> = {}) => {
    created.length = 0;
    const res = await checkout(new NextRequest("http://localhost/api/checkout", { method: "POST", body: JSON.stringify({ productType: "premium", reportId, email: reports.get(reportId)!.email, ...body }), headers: { "content-type": "application/json" } }));
    return { res, meta: created[0]?.metadata };
  };
  let r = await pay("r-ok", { agentId: "agent-pending" });
  check(r.res.status === 200 && r.meta?.referralAgentId === "agent-ok" && r.meta?.agentId === undefined, "approved agent on the report row; the body's agentId (a pending agent) is ignored", JSON.stringify(r.meta));
  r = await pay("r-none", { agentId: "agent-ok" });
  check(r.res.status === 200 && r.meta?.referralAgentId === "" && r.meta?.agentId === undefined, "no agent on the report: a body agentId credits nobody", JSON.stringify(r.meta));
  r = await pay("r-pending");
  check(r.meta?.referralAgentId === "", "a pending agent on the row is not credited");
  r = await pay("r-rejected");
  check(r.meta?.referralAgentId === "", "a rejected agent on the row is not credited");
  check(!/body\.agentId|agentId\?:/.test(readFileSync("app/api/checkout/route.ts", "utf8")), "the route no longer reads or declares a body agentId");

  // ── 2. webhook ──────────────────────────────────────────────────────────────
  console.log("\n2. Stripe webhook: the report's agent, approved only, GST-exclusive commission, post-payment notice without client details");
  const { POST: webhook } = await import("../app/api/stripe/webhook/route");
  let n = 0;
  async function sale(reportId: string, opts: { metaAgent?: string; amount?: number; customerEmail?: string } = {}) {
    sent.length = 0;
    transactions.length = 0;
    const rep = reports.get(reportId)!;
    const email = opts.customerEmail ?? rep.email;
    rep.email = email;
    const id = `cs_test_${++n}`;
    const amount = opts.amount ?? 3999;
    const session = {
      id,
      object: "checkout.session",
      customer_email: email,
      customer_details: { email, name: rep.fullName },
      amount_total: amount,
      payment_status: amount === 0 ? "no_payment_required" : "paid",
      currency: "aud",
      total_details: { amount_tax: 12345 /* Stripe's own figure must be ignored */ },
      metadata: { productType: "premium", email, assessmentId: reportId, reportId, leadId: reportId, agentId: opts.metaAgent ?? "" },
    };
    fixtures.set(id, { ...session, discounts: [], total_details: { amount_tax: 12345, breakdown: { discounts: [], taxes: [] } } });
    const payload = JSON.stringify({ id: `evt_${id}`, object: "event", type: "checkout.session.completed", data: { object: session } });
    const header = probe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
    const res = await webhook(new NextRequest("http://localhost/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": header } }));
    await flush();
    return res;
  }
  await sale("r-ok", { metaAgent: "agent-pending" });
  check(transactions.length === 1 && transactions[0].agentId === "agent-ok", "agent = the report's (approved) agent, not the metadata's", JSON.stringify(transactions[0]));
  check(transactions[0]?.commissionRate === 0.25 && transactions[0]?.commissionAmount === 9.09, "25% of the GST-exclusive A$36.35 = A$9.09 (not of A$39.99)", `${transactions[0]?.commissionAmount}`);
  check(transactions[0]?.gstCents === 364 && transactions[0]?.totalCents === 3999 && Number(transactions[0]?.totalAmount) === 39.99, "GST worked out locally (A$3.64), Stripe's own amount_tax ignored", `${transactions[0]?.gstCents}`);
  const notice = sent.find((m) => m.to.includes("ok@agents.example"));
  check(!!notice && /purchased/i.test(notice.subject), "the approved agent gets the post-payment notice", JSON.stringify(sent.map((m) => m.to)));
  const body = `${notice?.subject} ${notice?.text} ${notice?.html}`;
  check(!!notice && !/client-r-ok|Client Name|r-ok|REPORT-CONTENT|Software Engineer/i.test(body), "the notice carries no client name, email, reference or detail");
  await sale("r-ok", { amount: 0 });
  check(transactions[0]?.commissionAmount === 0, "a 100%-discount sale earns A$0");
  reports.set("r-default", mkReport("r-default", "agent-default", false));
  await sale("r-default");
  check(transactions[0]?.commissionRate === 0.2 && transactions[0]?.commissionAmount === 7.27, "an agent without a rate: default 20% of A$36.35 = A$7.27", `${transactions[0]?.commissionAmount}`);
  await sale("r-pending", { metaAgent: "agent-pending" });
  check(transactions[0]?.agentId === null && transactions[0]?.commissionAmount === null && !sent.some((m) => m.to.includes("pending@agents.example")), "a pending agent: no agent on the sale, no commission, no email");
  await sale("r-rejected", { metaAgent: "agent-rejected" });
  check(transactions[0]?.agentId === null && transactions[0]?.commissionAmount === null && !sent.some((m) => m.to.includes("rejected@agents.example")), "a rejected agent: nothing");
  await sale("r-none", { metaAgent: "agent-ok" });
  check(transactions[0]?.agentId === null && !sent.some((m) => m.to.includes("ok@agents.example")), "metadata naming an approved agent on a report with none credits nobody");
  await sale("r-ok", { customerEmail: "owner-admin@example.com" });
  check(!sent.some((m) => m.to.includes("ok@agents.example")), "the owner's own test purchase (listed address) sends the agent nothing");

  // ── 3. submit ───────────────────────────────────────────────────────────────
  console.log("\n3. submit: only an approved agent is attributed; no agent email at submit");
  const { submitFullCheckWaitlist } = await import("../app/[locale]/(main)/full-check/actions");
  const { REVIEW_PERSONAS } = await import("./render-persona-pdfs");
  const base = REVIEW_PERSONAS["reference-se-au"];
  const form = (email: string) => {
    const f = new FormData();
    for (const [k, v] of Object.entries({ email, fullName: "Referred Client", targetCountry: "AU", routeLocale: "en", currentCountry: "Australia", passportCountry: "Turkey", age: "30", occupation: String(base.occupation), visaInterest: "491", qualificationLevel: "Bachelor", englishLevel: "superior", sponsorOrFamily: "Single", annualSalaryAud: "90000", targetVisa: "491", employerSussorship: "x", employerSponsorship: "none", residenceState: "NSW" })) f.set(k, v);
    return f;
  };
  for (const [label, cookie, expectAgent] of [["approved agent", "agent-ok", true], ["pending agent", "agent-pending", false], ["rejected agent", "agent-rejected", false], ["unknown id", "nobody", false], ["admin user id", "admin-1", false]] as const) {
    signOutAll();
    cookieJar.set("logivisa_ref", cookie);
    insertArgs.length = 0;
    sent.length = 0;
    const made = await submitFullCheckWaitlist({ status: "idle" }, form("referred-client@example.org"));
    await flush();
    check(made.status === "success", `${label}: the report is created`, JSON.stringify(made).slice(0, 160));
    const attributed = insertArgs.some((a) => a.includes(cookie));
    check(attributed === expectAgent, `${label}: ${expectAgent ? "attributed" : "not attributed"}`, JSON.stringify(insertArgs[0]?.slice(-5)));
    check(!sent.some((m) => /agents\.example/.test(m.to.join(","))), `${label}: no email to any agent at submit`, JSON.stringify(sent.map((m) => m.to)));
  }
  signOutAll();

  // ── 4. agent reads ──────────────────────────────────────────────────────────
  console.log("\n4. agent reads: no client details, no report / PDF, nothing for pending / rejected, by direct URL included");
  const { getAgentReferrals, getAgentLead } = await import("../lib/crm/leads");
  const { getAgentTransactions } = await import("../lib/crm/transactions");
  reports.set("r-paid", mkReport("r-paid", "agent-ok", true));
  reports.set("r-unpaid", mkReport("r-unpaid", "agent-ok", false));
  transactions.length = 0;
  transactions.push({ agentId: "agent-ok", leadId: "r-paid", totalAmount: 39.99, commissionAmount: 9.09, buyerEmail: "buyer@example.org" });
  const PII = /client-r-|Client Name|\+61 400|buyer@example\.org|leak@example\.org|SHOULD-NOT-LEAK|REPORT-CONTENT|Software Engineer|Hot|High intent/;
  const refs = await getAgentReferrals("agent-ok");
  check(refs.length >= 2 && !PII.test(JSON.stringify(refs)), "the referred-client list carries no name, email, phone, tier or report", JSON.stringify(refs[0]));
  check(refs.find((x) => x.id === "r-paid")?.isPaid === true && refs.find((x) => x.id === "r-unpaid")?.isPaid === false, "it carries the purchase status");
  const one = await getAgentLead("agent-ok", "r-paid");
  check(!!one && !PII.test(JSON.stringify(one)), "a single referred client: no details", JSON.stringify(Object.keys(one ?? {})));
  check((await getAgentLead("agent-default", "r-paid")) === null, "another agent's client: nothing");
  const tx = await getAgentTransactions("agent-ok");
  check(tx.length === 1 && !PII.test(JSON.stringify(tx)) && /^Referred client [0-9A-Z]{4,8}$/.test(tx[0].leadName), "the commission list shows a reference, not the client", JSON.stringify(tx[0]));

  const { GET: agentPdf } = await import("../app/api/agent/lead/[id]/pdf/route");
  const getPdf = async (id: string) => agentPdf(new Request(`http://localhost/api/agent/lead/${id}/pdf`), { params: Promise.resolve({ id }) });
  const session = (id: string | null) => (id ? setNextAuthSession({ user: { id, email: USERS[id].email, role: USERS[id].role, approvalStatus: USERS[id].approvalStatus } } as never) : signOutAll());
  session(null);
  check((await getPdf("r-paid")).status === 401, "the PDF route: signed out -> 401");
  for (const [who, id] of [["approved agent, own PAID report", "r-paid"], ["approved agent, own UNPAID report", "r-unpaid"]] as const) {
    session("agent-ok");
    const res = await getPdf(id);
    const text = await res.text();
    check(res.status === 403 && !/%PDF|REPORT-CONTENT/.test(text), `the PDF route: ${who} -> 403 (client details are not shared with agents yet)`, String(res.status));
  }
  for (const who of ["agent-pending", "agent-rejected"]) {
    session(who);
    check((await getPdf("r-paid")).status === 403 && (await getPdf("r-pending")).status === 403, `the PDF route: ${who} -> 403 for any report`);
  }
  const { runReadinessEngine } = await import("../src/lib/readiness-engine");
  reports.set("r-admin", { ...mkReport("r-admin", "agent-ok", true), reportJson: JSON.parse(JSON.stringify(runReadinessEngine({ ...base, locale: "en", targetVisa: "491", preferredPathway: "491" }))), inputJson: { ...base, locale: "en", targetVisa: "491" } });
  session("admin-1");
  const adminRes = await getPdf("r-admin");
  check(adminRes.status === 200 && /pdf/.test(adminRes.headers.get("content-type") ?? ""), "an admin still downloads any report PDF", String(adminRes.status));

  const { requireApprovedAgentPage, getApprovedAgentFromSession } = await import("../lib/crm/agent-access");
  const redirectsTo = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      return null;
    } catch (e) {
      return String((e as { digest?: string; message?: string }).digest ?? (e as Error).message);
    }
  };
  session("agent-pending");
  check(/agent\/dashboard/.test((await redirectsTo(() => requireApprovedAgentPage("en", "/agent/lead/r-paid"))) ?? ""), "the lead page guard: a pending agent is sent to the dashboard (pending notice), nothing is read");
  session("agent-rejected");
  check(/agent\/dashboard/.test((await redirectsTo(() => requireApprovedAgentPage("en", "/agent/lead/r-paid"))) ?? ""), "...and a rejected agent too (the database decides, not the session)");
  setNextAuthSession({ user: { id: "agent-rejected", email: "x", role: "AGENT", approvalStatus: "APPROVED" } } as never); // a stale session that still says APPROVED
  check((await getApprovedAgentFromSession()) === null && /agent\/dashboard/.test((await redirectsTo(() => requireApprovedAgentPage("en", "/agent/earnings"))) ?? ""), "a stale session saying APPROVED does not open anything for a rejected agent");
  session("agent-ok");
  check((await redirectsTo(() => requireApprovedAgentPage("en", "/agent/lead/r-paid"))) === null && (await getApprovedAgentFromSession())?.id === "agent-ok", "an approved agent passes the guard");

  const { addLeadNoteAction } = await import("../lib/crm/notes-actions");
  session("agent-pending");
  check(!!(await addLeadNoteAction("r-paid", "note")).error, "notes: a pending agent cannot add a note");
  session("agent-rejected");
  check(!!(await addLeadNoteAction("r-paid", "note")).error, "notes: a rejected agent cannot add a note");
  const { updateLeadStatusAction } = await import("../app/[locale]/(portal)/agent/lead/[id]/actions");
  session("agent-pending");
  check(!!(await updateLeadStatusAction("en", "r-paid", "Contacted")).error, "workflow: a pending agent cannot change a status");

  // Source guards: no agent-facing file reads a client detail.
  const agentFiles = ["app/[locale]/(portal)/agent/dashboard/page.tsx", "app/[locale]/(portal)/agent/lead/[id]/page.tsx", "app/[locale]/(portal)/agent/earnings/page.tsx", "lib/crm/transactions.ts"].map((f) => {
    const src = readFileSync(f, "utf8");
    // transactions.ts also holds the ADMIN views (which show buyers); only the agent-facing functions are checked.
    return [f, f.endsWith("transactions.ts") ? src.slice(src.indexOf("export async function getAgentTransactions"), src.indexOf("/** Sum of an agent")) + src.slice(src.indexOf("export async function getAgentEarnings"), src.indexOf("/** Admin view")) : src] as const;
  });
  for (const [f, src] of agentFiles) check(!/\b(lead|r|referral|row)\.(email|fullName|phone|pointsTier|reportJson|inputJson)\b|splitName|tierBadgeClass|buyerEmail|AGENT_LEAD_NOTICE|iframe/.test(src.replace(/select:\s*\{[^}]*\}/g, "")), `${f}: reads no client detail`);
  check(/role === "AGENT"[\s\S]{0,400}403/.test(readFileSync("app/api/agent/lead/[id]/pdf/route.ts", "utf8")), "the PDF route refuses the AGENT role before reading a report");

  // ── 5. admin assignment ─────────────────────────────────────────────────────
  console.log("\n5. admin assignment");
  // revalidatePath needs a Next request store; the assignment itself is what is tested.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nextCachePath = require.resolve("next/cache");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const realCache = require("next/cache");
  require.cache[nextCachePath]!.exports = { ...realCache, revalidatePath: () => undefined, revalidateTag: () => undefined };
  const { assignLeadToAgent } = await import("../app/[locale]/(portal)/admin/crm/actions");
  session("admin-1");
  for (const bad of ["agent-pending", "agent-rejected", "nobody"]) {
    let threw = false;
    try {
      await assignLeadToAgent("r-none", bad, "en");
    } catch {
      threw = true;
    }
    check(threw && reports.get("r-none")!.agentId === null, `assigning to ${bad} is refused and changes nothing`);
  }
  sent.length = 0;
  reports.set("r-unpaid2", mkReport("r-unpaid2", null, false));
  await assignLeadToAgent("r-unpaid2", "agent-ok", "en");
  await flush();
  check(reports.get("r-unpaid2")!.agentId === "agent-ok" && !sent.some((m) => m.to.includes("ok@agents.example")), "an unpaid full-check report: assigned to an approved agent, no email to the agent");
  reports.set("r-paid2", mkReport("r-paid2", null, true));
  await assignLeadToAgent("r-paid2", "agent-ok", "en");
  await flush();
  const assigned = sent.find((m) => m.to.includes("ok@agents.example"));
  check(!!assigned && !/Client Name|client-r-/.test(`${assigned.subject} ${assigned.html} ${assigned.text}`), "a paid one: a generic assignment email with no client details", JSON.stringify(assigned?.subject));
  signOutAll();

  // ── 6. labels ───────────────────────────────────────────────────────────────
  console.log("\n6. currency and commission wording");
  const { formatAud } = await import("../lib/crm/format-money");
  check(/AUD/.test(formatAud(9.09)) && !/USD|US\$/.test(formatAud(9.09)), "money is formatted as AUD", formatAud(9.09));
  const portal = ["app/[locale]/(portal)/agent/dashboard/page.tsx", "app/[locale]/(portal)/agent/earnings/page.tsx"].map((f) => readFileSync(f, "utf8")).join("\n");
  check(!/USD|en-US|formatUsd/.test(portal) && /formatAud/.test(portal) && /excl(uding|\.)? GST/.test(portal), "the portal says AUD and that commission is on the amount excluding GST");

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
