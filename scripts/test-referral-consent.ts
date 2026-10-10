/**
 * Referral consent (docs/agent-referral-audit.md section 8.2): the REAL prompt route, submit action, withdrawal route, canAgentSeeClient, agent data
 * functions, agent PDF route, notes action and admin assignment, with only the edges stubbed (Prisma in memory incl. an append-only consent log,
 * Resend recorder, cookies, session).
 *
 *   npx tsx scripts/test-referral-consent.ts
 */
import { readFileSync } from "node:fs";
import { cookieJar, setNextAuthSession, signOutAll } from "./lib/stub-request-context";

process.env.AUTH_SECRET = "test-auth-secret-for-referral-consent";
process.env.ADMIN_EMAILS = "owner-admin@example.com";
process.env.KNOWN_TEST_EMAILS = "";
process.env.RESEND_API_KEY = "re_test_stub_not_a_real_key";
process.env.FROM_EMAIL = "LogiVisa Test <noreply@example.test>";
process.env.NEXT_PUBLIC_BASE_URL = "https://example.test";
process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable";
delete process.env.ENABLE_TRANSACTIONAL_EMAILS;
delete process.env.SIMULATE_EMAIL_DELIVERY;
delete process.env.READINESS_REPORT_PAID_CHECKOUT_ENABLED;

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};

type User = { id: string; email: string; name: string | null; role: "AGENT" | "ADMIN"; approvalStatus: string; commissionRate: number | null };
const USERS: Record<string, User> = {
  "agent-ok": { id: "agent-ok", email: "ok@agents.example", name: "Ada <b>Approved</b>", role: "AGENT", approvalStatus: "APPROVED", commissionRate: 25 },
  "agent-other": { id: "agent-other", email: "other@agents.example", name: "Olga Other", role: "AGENT", approvalStatus: "APPROVED", commissionRate: 25 },
  "agent-noname": { id: "agent-noname", email: "noname@agents.example", name: null, role: "AGENT", approvalStatus: "APPROVED", commissionRate: 25 },
  "agent-pending": { id: "agent-pending", email: "pending@agents.example", name: "Pat Pending", role: "AGENT", approvalStatus: "PENDING", commissionRate: 25 },
  "admin-1": { id: "admin-1", email: "admin@example.com", name: "Admin", role: "ADMIN", approvalStatus: "APPROVED", commissionRate: null },
};

type Report = Record<string, unknown> & { id: string; email: string; agentId: string | null; isUnlocked: boolean; paymentStatus: string; unlockMethod: string | null; fullName: string; source: string };
const reports = new Map<string, Report>();
const mk = (id: string, agentId: string | null, paid: boolean, source = "full_check"): Report => ({
  id, email: `client-${id}@example.org`, fullName: `Client Name ${id}`, phone: "+61 400 000 111", agentId, source, locale: "en", pointsTier: "Hot", leadTier: "High intent", preferredPath: "189",
  isUnlocked: paid, paymentStatus: paid ? "paid" : "pending", unlockMethod: paid ? "payment" : null, createdAt: new Date("2026-10-01T00:00:00Z"), docStatus: "New", agentNotes: null, market: "GLOBAL",
  reportJson: null, inputJson: {},
});

// The consent log: append-only. The stub itself refuses UPDATE / DELETE like the trigger does.
type ConsentRow = { id: string; report_id: string; agent_id: string; event: string; consent_text_version: string; consent_text: string; locale: string; ip_hash: string | null; user_agent: string | null; created_at: number };
const consents: ConsentRow[] = [];
let tableExists = true;
let clock = 1;
const insertArgs: unknown[][] = [];

const matches = (r: Report, w: Record<string, unknown>) =>
  Object.entries(w).every(([k, v]) => {
    const val = r[k];
    if (v && typeof v === "object" && "notIn" in (v as object)) return !(v as { notIn: unknown[] }).notIn.includes(val);
    return val === v;
  });
(globalThis as { prisma?: unknown }).prisma = {
  user: {
    findFirst: async ({ where }: { where: Record<string, unknown> }) =>
      Object.values(USERS).find((u) => (where.id === undefined || u.id === where.id) && (where.role === undefined || u.role === where.role) && (where.approvalStatus === undefined || u.approvalStatus === where.approvalStatus)) ?? null,
    findUnique: async ({ where }: { where: { id?: string; email?: string } }) => USERS[where.id ?? ""] ?? Object.values(USERS).find((u) => u.email === where.email) ?? null,
  },
  userReport: {
    findUnique: async ({ where }: { where: { id: string } }) => reports.get(where.id) ?? null,
    findFirst: async ({ where }: { where: Record<string, unknown> }) => [...reports.values()].find((r) => matches(r, where)) ?? null,
    findMany: async ({ where }: { where: Record<string, unknown> }) => [...reports.values()].filter((r) => matches(r, where)),
    count: async () => 0,
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => Object.assign(reports.get(where.id)!, data),
    updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      const hit = [...reports.values()].filter((r) => matches(r, where));
      hit.forEach((r) => Object.assign(r, data));
      return { count: hit.length };
    },
  },
  leadNote: { findMany: async () => [], create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "n1", ...data, createdAt: new Date(), author: { name: "x", role: "AGENT" } }) },
  transaction: { findUnique: async () => null, create: async ({ data }: { data: Record<string, unknown> }) => data, findMany: async () => [], aggregate: async () => ({ _sum: { commissionAmount: 0 } }) },
  $queryRawUnsafe: async (sql: string, ...args: unknown[]) => {
    if (/referral_consents/.test(sql)) {
      if (!tableExists) throw new Error('relation "referral_consents" does not exist');
      if (/^\s*(UPDATE|DELETE)/i.test(sql)) throw new Error("referral_consents is append-only");
      if (/INSERT INTO referral_consents/i.test(sql)) {
        const [report_id, agent_id, event, consent_text_version, consent_text, locale, ip_hash, user_agent] = args as string[];
        consents.push({ id: `c${consents.length + 1}`, report_id, agent_id, event, consent_text_version, consent_text, locale, ip_hash, user_agent, created_at: clock++ });
        return [];
      }
      if (/SELECT 1 FROM referral_consents/i.test(sql)) return [];
      const rows = consents.filter((c) => c.report_id === args[0] && (args[1] === undefined || c.agent_id === args[1])).sort((a, b) => b.created_at - a.created_at);
      return /LIMIT 1/.test(sql) ? rows.slice(0, 1) : rows;
    }
    if (/INSERT INTO user_reports/i.test(sql)) {
      insertArgs.push(args);
      const id = `new-${insertArgs.length}`;
      const agentCol = args.find((a) => typeof a === "string" && USERS[a as string]) as string | undefined;
      reports.set(id, { ...mk(id, agentCol ?? null, false), email: String(args[1] ?? "x@example.org") });
      return [{ id }];
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
  const sent: Array<{ to: string[]; subject: string; html?: string; text?: string }> = [];
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resend } = require("resend") as typeof import("resend");
  (Object.getPrototypeOf(new Resend("re_stub").emails) as { send: unknown }).send = async (p: { to: string | string[]; subject: string; text?: string; html?: string; react?: unknown }) => {
    sent.push({ to: Array.isArray(p.to) ? p.to : [p.to], subject: p.subject, text: p.text, html: p.html ?? JSON.stringify(p.react ?? "") });
    return { data: { id: "stub" }, error: null };
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nextCachePath = require.resolve("next/cache");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const realCache = require("next/cache");
  require.cache[nextCachePath]!.exports = { ...realCache, revalidatePath: () => undefined, revalidateTag: () => undefined };
  const flush = () => new Promise((r) => setTimeout(r, 80));
  const { NextRequest } = await import("next/server");
  const session = (id: string | null) => (id ? setNextAuthSession({ user: { id, email: USERS[id].email, role: USERS[id].role, approvalStatus: USERS[id].approvalStatus } } as never) : signOutAll());

  const lib = await import("../lib/consent/referral-consent");
  const { canAgentSeeClient } = await import("../lib/crm/agent-access");

  // ── 1. the prompt: server-resolved agent, named from the database ───────────────────────────────
  console.log("1. prompt: shown only for an approved, named agent resolved on the server; the name comes from the database");
  const { GET: prompt } = await import("../app/api/referral-consent/prompt/route");
  const getPrompt = async (cookie: string | null, locale = "en") => {
    signOutAll();
    if (cookie) cookieJar.set("logivisa_ref", cookie);
    const res = await prompt(new NextRequest(`http://localhost/api/referral-consent/prompt?locale=${locale}&agentName=EVIL`));
    return (await res.json()) as { show: boolean; agentName?: string; text?: string; notice?: string; version?: string };
  };
  const p = await getPrompt("agent-ok");
  check(p.show === true && p.agentName === "Ada <b>Approved</b>" && !!p.text?.includes("Ada <b>Approved</b>") && p.version === lib.CONSENT_TEXT_VERSION, "approved agent: checkbox text names the agent from the database", JSON.stringify(p));
  check(!/EVIL/.test(JSON.stringify(p)), "a name passed in the URL is ignored");
  check((await getPrompt(null)).show === false, "no referral cookie: nothing shown");
  check((await getPrompt("agent-pending")).show === false, "a pending agent: nothing shown");
  check((await getPrompt("agent-noname")).show === false, "an agent with no name on file: nothing shown (we cannot name them)");
  check((await getPrompt("nobody")).show === false && (await getPrompt("admin-1")).show === false, "unknown id / admin id: nothing shown");
  const tr = await getPrompt("agent-ok", "tr");
  const zh = await getPrompt("agent-ok", "zh-Hans");
  check(/paylaşılmasını/.test(tr.text ?? "") && /komisyon/.test(tr.notice ?? "") && /同意/.test(zh.text ?? "") && /佣金/.test(zh.notice ?? ""), "Turkish and Chinese wording, each with the commission notice");
  check(/commission/.test(p.notice ?? "") && /optional/.test(p.notice ?? ""), "English notice: commission disclosed, ticking optional");
  tableExists = false;
  check((await getPrompt("agent-ok")).show === false, "consent table missing: nothing is offered (no choice we cannot store)");
  tableExists = true;

  // ── 2. submit ────────────────────────────────────────────────────────────────────────────────────
  console.log("\n2. submit: consent stored with timestamp, exact text and version; a client can buy without consenting");
  const { submitFullCheckWaitlist } = await import("../app/[locale]/(main)/full-check/actions");
  const { REVIEW_PERSONAS } = await import("./render-persona-pdfs");
  const base = REVIEW_PERSONAS["reference-se-au"];
  const form = (email: string, consent: boolean, locale = "en") => {
    const f = new FormData();
    for (const [k, v] of Object.entries({ email, fullName: "Referred Client", targetCountry: "AU", routeLocale: locale, currentCountry: "Australia", passportCountry: "Turkey", age: "30", occupation: String(base.occupation), visaInterest: "491", qualificationLevel: "Bachelor", englishLevel: "superior", sponsorOrFamily: "Single", annualSalaryAud: "90000", targetVisa: "491", employerSussorship: "x", employerSponsorship: "none", residenceState: "NSW" })) f.set(k, v);
    if (consent) f.set("referralConsent", "on");
    return f;
  };
  const submit = async (cookie: string | null, consent: boolean, locale = "en") => {
    signOutAll();
    if (cookie) cookieJar.set("logivisa_ref", cookie);
    sent.length = 0;
    const made = await submitFullCheckWaitlist({ status: "idle" }, form(`consent-${consents.length}-${Math.random().toString(36).slice(2, 6)}@example.org`, consent, locale));
    await flush();
    return made;
  };
  const before = consents.length;
  let made = await submit("agent-ok", true);
  const granted = consents[consents.length - 1];
  check(made.status === "success" && consents.length === before + 1 && granted.event === "granted" && granted.agent_id === "agent-ok", "ticked: one 'granted' row for this report and the cookie's agent", JSON.stringify(granted));
  check(granted.consent_text_version === lib.CONSENT_TEXT_VERSION && granted.consent_text === lib.consentText("en", "Ada <b>Approved</b>") && granted.locale === "en" && granted.created_at > 0, "the row holds the exact wording shown, its version, the locale and a timestamp");
  const h = lib.hashIp("203.0.113.9");
  check(!!h && h.length === 32 && !h.includes("203") && lib.hashIp("unknown") === null && lib.hashIp(undefined) === null && !/\d+\.\d+\.\d+\.\d+/.test(String(granted.ip_hash)), "the network address is stored hashed (never raw; none when unknown)");
  const readyMail = sent.find((m) => m.subject.includes("preview") || m.subject.includes("ön izleme") || m.subject.includes("预览"));
  check(!!readyMail && /Withdraw that agreement/.test(readyMail.html ?? "") && (readyMail.html ?? "").includes("/api/referral-consent/withdraw?r=") && !/<b>Approved<\/b>/.test(readyMail.html ?? "") && /&#60;b&#62;Approved/.test(readyMail.html ?? ""), "the client's email carries the withdrawal link and the agent's name, HTML-escaped", readyMail?.html?.slice(-900));
  const n1 = consents.length;
  made = await submit("agent-ok", false);
  check(made.status === "success" && consents.length === n1, "NOT ticked: the report is still created, no consent row is written");
  const mailNoConsent = sent.find((m) => /preview|ön izleme|预览/.test(m.subject));
  check(!!mailNoConsent && !/api\/referral-consent/.test(mailNoConsent.html ?? ""), "...and that email has no withdrawal link (nothing was shared)");
  made = await submit("agent-pending", true);
  check(made.status === "success" && consents.length === n1, "a ticked box with a pending agent in the cookie: nothing stored");
  made = await submit(null, true);
  check(made.status === "success" && consents.length === n1, "a ticked box with no referral at all: nothing stored (the form never offers it)");
  made = await submit("agent-ok", true, "tr");
  check(consents[consents.length - 1].locale === "tr" && /danışman/.test(consents[consents.length - 1].consent_text), "Turkish form: the Turkish wording is what is stored");
  made = await submit("agent-ok", true, "zh-Hans");
  check(consents[consents.length - 1].locale === "zh-Hans" && /同意/.test(consents[consents.length - 1].consent_text), "Chinese form: the Chinese wording is what is stored");
  tableExists = false;
  made = await submit("agent-ok", true);
  check(made.status === "success", "consent table missing: the purchase flow still works (report created)");
  tableExists = true;
  signOutAll();

  // ── 3. canAgentSeeClient ─────────────────────────────────────────────────────────────────────────
  console.log("\n3. canAgentSeeClient: the one gate");
  const give = (reportId: string, agentId: string, version = lib.CONSENT_TEXT_VERSION) => consents.push({ id: `g${consents.length}`, report_id: reportId, agent_id: agentId, event: "granted", consent_text_version: version, consent_text: "t", locale: "en", ip_hash: null, user_agent: null, created_at: clock++ });
  const withdraw = (reportId: string, agentId: string) => consents.push({ id: `w${consents.length}`, report_id: reportId, agent_id: agentId, event: "withdrawn", consent_text_version: lib.CONSENT_TEXT_VERSION, consent_text: "w", locale: "en", ip_hash: null, user_agent: null, created_at: clock++ });
  reports.set("c-none", mk("c-none", "agent-ok", true));
  reports.set("c-yes", mk("c-yes", "agent-ok", true));
  reports.set("c-wd", mk("c-wd", "agent-ok", true));
  reports.set("c-old", mk("c-old", "agent-ok", true));
  reports.set("c-guide", mk("c-guide", "agent-ok", true, "pdf_global_guide"));
  reports.set("c-pending", mk("c-pending", "agent-pending", true));
  give("c-yes", "agent-ok");
  give("c-wd", "agent-ok");
  withdraw("c-wd", "agent-ok");
  give("c-old", "agent-ok", "2020-old-wording");
  give("c-guide", "agent-ok");
  give("c-pending", "agent-pending");
  check((await canAgentSeeClient("agent-ok", "c-yes")) === true, "granted -> true");
  check((await canAgentSeeClient("agent-ok", "c-none")) === false, "no consent row -> false");
  check((await canAgentSeeClient("agent-ok", "c-wd")) === false, "granted then withdrawn -> false");
  check((await canAgentSeeClient("agent-ok", "c-old")) === false, "a consent to an unaccepted wording version -> false");
  check((await canAgentSeeClient("agent-other", "c-yes")) === false, "another agent -> false (consent is per agent)");
  check((await canAgentSeeClient("agent-pending", "c-pending")) === false, "a pending agent with a consent row -> false");
  check((await canAgentSeeClient("agent-ok", "c-guide")) === false, "a guide-download lead, even with a consent row -> false");
  check((await canAgentSeeClient("agent-ok", "nope")) === false && (await canAgentSeeClient(null, "c-yes")) === false && (await canAgentSeeClient("admin-1", "c-yes")) === false, "unknown report / no agent / an admin id -> false");
  tableExists = false;
  check((await canAgentSeeClient("agent-ok", "c-yes")) === false, "consent table missing -> false (fails closed)");
  tableExists = true;
  give("c-wd", "agent-ok");
  check((await canAgentSeeClient("agent-ok", "c-wd")) === true, "a new grant after a withdrawal counts again (the newest row decides)");
  check(consents.filter((c) => c.report_id === "c-wd").length === 3, "...and the history is kept: grant, withdrawal, grant");

  // ── 4. agent reads ───────────────────────────────────────────────────────────────────────────────
  console.log("\n4. agent reads go through the gate");
  const { getAgentReferrals, getAgentLead } = await import("../lib/crm/leads");
  const refs = await getAgentReferrals("agent-ok");
  const byId = new Map(refs.map((x) => [x.id, x]));
  check(byId.get("c-yes")?.sharing === true && byId.get("c-yes")?.client?.email === "client-c-yes@example.org" && byId.get("c-yes")?.client?.name === "Client Name c-yes", "dashboard list: a consenting client shows name, email and phone");
  check(byId.get("c-none")?.sharing === false && byId.get("c-none")?.client === undefined, "no consent: reference only");
  check(!/client-c-none|Client Name c-none|\+61 400/.test(JSON.stringify(byId.get("c-none"))) && !/client-c-old|client-c-guide/.test(JSON.stringify(refs)), "no PII for unconsenting rows (and guide leads are absent)");
  check(!/Hot|High intent|inputJson|reportJson/.test(JSON.stringify(refs)), "tier and entered details are never in the agent shape, consent or not");
  check((await getAgentLead("agent-ok", "c-yes"))?.client?.phone === "+61 400 000 111" && (await getAgentLead("agent-ok", "c-none"))?.client === undefined, "lead page data: same rule");
  const { updateLeadStatusAction } = await import("../app/[locale]/(portal)/agent/lead/[id]/actions");
  const { addLeadNoteAction } = await import("../lib/crm/notes-actions");
  session("agent-ok");
  check(!!(await addLeadNoteAction("c-none", "note")).error && !(await addLeadNoteAction("c-yes", "note")).error, "notes: refused without consent, allowed with it");
  check(!!(await updateLeadStatusAction("en", "c-none", "Contacted")).error && (await updateLeadStatusAction("en", "c-yes", "Contacted")).success === true, "status workflow: refused without consent, allowed with it");

  // PDF route
  const { runReadinessEngine } = await import("../src/lib/readiness-engine");
  const reportJson = JSON.parse(JSON.stringify(runReadinessEngine({ ...base, locale: "en", targetVisa: "491", preferredPathway: "491" })));
  const withReport = (id: string, extra: Partial<Report>) => reports.set(id, { ...mk(id, "agent-ok", true), reportJson, inputJson: { ...base, locale: "en", targetVisa: "491" }, ...extra });
  withReport("p-ok", {});
  give("p-ok", "agent-ok");
  withReport("p-unpaid", { isUnlocked: false, paymentStatus: "pending", unlockMethod: null });
  give("p-unpaid", "agent-ok");
  withReport("p-noconsent", {});
  withReport("p-partner", { inputJson: { ...base, locale: "en", preferredPathway: "820_801" } });
  give("p-partner", "agent-ok");
  withReport("p-canada", { inputJson: { ...base, locale: "en", country: "CA" } });
  give("p-canada", "agent-ok");
  const { GET: agentPdf } = await import("../app/api/agent/lead/[id]/pdf/route");
  const getPdf = async (id: string) => agentPdf(new Request(`http://localhost/api/agent/lead/${id}/pdf`), { params: Promise.resolve({ id }) });
  session("agent-ok");
  const okRes = await getPdf("p-ok");
  check(okRes.status === 200 && /pdf/.test(okRes.headers.get("content-type") ?? ""), "PDF: consent + paid + own -> 200", String(okRes.status));
  for (const [what, id] of [["unpaid (consent given)", "p-unpaid"], ["no consent", "p-noconsent"], ["partner report", "p-partner"], ["Canada report", "p-canada"], ["withdrawn", "c-wd-none"]] as const) {
    if (id === "c-wd-none") {
      withReport("p-wd", {});
      give("p-wd", "agent-ok");
      withdraw("p-wd", "agent-ok");
    }
    const res = await getPdf(id === "c-wd-none" ? "p-wd" : id);
    check(res.status === 403, `PDF: ${what} -> 403`, String(res.status));
  }
  session("agent-other");
  check((await getPdf("p-ok")).status === 403, "PDF: another agent -> 403");
  session("agent-pending");
  check((await getPdf("p-ok")).status === 403, "PDF: a pending agent -> 403");
  session("admin-1");
  check((await getPdf("p-noconsent")).status === 200, "PDF: an admin is unchanged (no consent needed)");
  signOutAll();
  check((await getPdf("p-ok")).status === 401, "PDF: signed out -> 401");

  // admin assignment email
  const { assignLeadToAgent } = await import("../app/[locale]/(portal)/admin/crm/actions");
  session("admin-1");
  reports.set("a-no", mk("a-no", null, true));
  reports.set("a-yes", mk("a-yes", null, true));
  give("a-yes", "agent-ok");
  sent.length = 0;
  await assignLeadToAgent("a-no", "agent-ok", "en");
  await flush();
  check(reports.get("a-no")!.agentId === "agent-ok" && !sent.some((m) => m.to.includes("ok@agents.example")), "admin assignment without consent: assigned, no email to the agent");
  await assignLeadToAgent("a-yes", "agent-ok", "en");
  await flush();
  const assignMail = sent.find((m) => m.to.includes("ok@agents.example"));
  check(!!assignMail && !/client-a-yes|Client Name/.test(`${assignMail.subject}${assignMail.html}`), "admin assignment with consent: the agent is emailed, still with no client details in the email");
  signOutAll();

  // ── 5. withdrawal ────────────────────────────────────────────────────────────────────────────────
  console.log("\n5. withdrawal: signed link, confirm step, append-only");
  const w = await import("../app/api/referral-consent/withdraw/route");
  const url = lib.withdrawalUrl("c-yes", "en");
  const goodGet = await w.GET(new NextRequest(url));
  const goodHtml = await goodGet.text();
  check(goodGet.status === 200 && /method="post"/.test(goodHtml) && (await canAgentSeeClient("agent-ok", "c-yes")) === true, "GET shows a confirm button and withdraws nothing (a link scanner cannot withdraw)");
  const bad = await w.GET(new NextRequest(url.replace(/t=[0-9a-f]+/, "t=deadbeef")));
  check(bad.status === 400, "a wrong token is refused");
  const otherReport = await w.GET(new NextRequest(url.replace("r=c-yes", "r=c-none")));
  check(otherReport.status === 400, "a token for one report does not work for another");
  const f = new FormData();
  f.set("r", encodeURIComponent("c-yes"));
  f.set("t", encodeURIComponent(lib.signConsentToken("c-yes")));
  f.set("l", "tr");
  const rowsBefore = consents.length;
  const done = await w.POST(new NextRequest("http://localhost/api/referral-consent/withdraw", { method: "POST", body: f }));
  check(done.status === 200 && /geri çekildi/.test(await done.text()), "POST withdraws (Turkish confirmation)");
  check(consents.length === rowsBefore + 1 && consents[consents.length - 1].event === "withdrawn" && consents.filter((c) => c.report_id === "c-yes" && c.event === "granted").length === 1, "a 'withdrawn' row is APPENDED; the grant row is untouched");
  check((await canAgentSeeClient("agent-ok", "c-yes")) === false && (await getAgentLead("agent-ok", "c-yes"))?.client === undefined, "the agent stops seeing the client at once (gate, lead page data)");
  session("agent-ok");
  check((await getPdf("p-ok")).status === 200, "(withdrawing one report does not affect another)");
  signOutAll();
  const again = await w.POST(new NextRequest("http://localhost/api/referral-consent/withdraw", { method: "POST", body: f }));
  check(/no active|etkin bir onay yok|没有可撤回/i.test(await again.text()) && consents.length === rowsBefore + 1, "withdrawing again adds nothing");
  const sqlTest = lib.CONSENT_TEXT_VERSION;
  check(typeof sqlTest === "string" && lib.ACCEPTED_CONSENT_VERSIONS.includes(sqlTest), "the wording version is a constant and is in the accepted list");

  // ── 6. append-only, schema, copy ─────────────────────────────────────────────────────────────────
  console.log("\n6. append-only, SQL, copy");
  const sql = readFileSync("prisma/manual-migrations/2026-10-10-create-referral-consents.sql", "utf8");
  check(/CREATE TABLE IF NOT EXISTS referral_consents/.test(sql) && /BEFORE UPDATE OR DELETE ON referral_consents/.test(sql) && /RAISE EXCEPTION/.test(sql) && /BEGIN;[\s\S]*COMMIT;/.test(sql), "SQL: idempotent create + a trigger that rejects UPDATE and DELETE, in one transaction");
  check(!/\b(DROP TABLE|ALTER TABLE|TRUNCATE)\b/i.test(sql.replace(/--.*$/gm, "")), "SQL: no DROP TABLE / ALTER TABLE / TRUNCATE");
  const code = readFileSync("lib/consent/referral-consent.ts", "utf8");
  check(!/\b(UPDATE|DELETE)\s+(FROM\s+)?referral_consents/i.test(code), "code: never updates or deletes a consent row");
  check(/model ReferralConsent[\s\S]*@@map\("referral_consents"\)/.test(readFileSync("prisma/schema.prisma", "utf8")), "schema.prisma declares the table (so `prisma db push` never proposes dropping it)");
  const gate = readFileSync("lib/crm/agent-access.ts", "utf8");
  check(!/AGENT_SEES_CLIENT_DETAILS/.test(gate) && /export async function canAgentSeeClient/.test(gate), "the old on/off switch is gone; canAgentSeeClient is the gate");
  for (const loc of ["en", "tr", "zh-Hans"]) {
    const d = JSON.parse(readFileSync(`public/locales/${loc}.json`, "utf8")) as Record<string, string>;
    check(["Title", "Text1", "Text2", "Text3"].every((k) => (d[`legal.privacyReferral${k}`] ?? "").length > (k === "Title" ? 8 : 40)), `privacy text present in ${loc}`);
  }
  const legal = readFileSync("app/[locale]/(main)/legal/page.tsx", "utf8");
  check(/privacyReferralTitle/.test(legal) && /privacyReferralText3/.test(legal), "the legal page renders the privacy section");
  const terms = readFileSync("app/[locale]/(main)/terms/terms-content.tsx", "utf8");
  check((terms.match(/<h2>12\. /g) ?? []).length === 3, "Terms: a referral-agents section in en, tr and zh-Hans");
  const box = readFileSync("app/[locale]/(main)/full-check/referral-consent-box.tsx", "utf8");
  check(/name="referralConsent"/.test(box) && /defaultChecked=\{false\}/.test(box), "the checkbox is unticked by default");
  check(!/referralConsent/.test(readFileSync("components/premium-feature-gate.tsx", "utf8")) && !/required/.test(box.replace(/Required/g, "")), "consent is not a condition of buying (not required, not in the unlock modal)");

  if (failures) {
    console.error(`\n❌ ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\n✅ ALL CHECKS PASSED");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
