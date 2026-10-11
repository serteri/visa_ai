/**
 * The state-page change monitor (lib/state-monitor) and the "data may have changed since" note it drives (en / tr / zh-Hans).
 *
 *   1. text extraction / normalisation: markup, whitespace and case are not changes; a real wording change is; the diff summary names it;
 *   2. runs: first sight = baseline (no alert); unchanged page -> no alert; changed page -> ONE alert (state, URL, diff summary, source file), none on
 *      the next run; two changed pages -> still one email; a failed email is retried, not lost;
 *   3. fetch failures: HTTP error / thrown error / empty page -> a single alert after 3 failures in a row (not one per run), reset by a success;
 *   4. every run is logged; a storage failure is reported, not swallowed; the monitor changes no report data;
 *   5. the note: shown only for a change the monitor saw that is not applied yet, or after 14 days without a successful check; cleared by "applied";
 *      rendered in the report in all three languages for exactly the right states;
 *   6. cron route (secret), weekly schedule, admin controls, SQL.
 *
 *   npx tsx scripts/test-state-monitor.ts
 */
import { readFileSync } from "node:fs";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects
process.env.RESEND_API_KEY = "re_test_stub_not_a_real_key";
process.env.ADMIN_NOTIFICATION_EMAIL = "admin@example.test";
(globalThis as { prisma?: unknown }).prisma = {
  $queryRawUnsafe: async () => { throw new Error('relation "state_page_monitor" does not exist'); },
  $disconnect: async () => undefined,
  stateAllocation: { findUnique: async () => null, findFirst: async () => null },
  occupation: { findUnique: async () => null, findFirst: async () => null },
  roundCutoff: { findUnique: async () => null, findFirst: async () => null },
  stateIntelligence: { findMany: async () => [] },
  stateNominationConfig: { findMany: async () => [] },
};

let failures = 0;
const t = (name: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${name}`);
  else {
    failures++;
    console.error(`  ❌ ${name}${detail ? ` -- ${detail}` : ""}`);
  }
};

const page = (body: string) => `<html><head><title>x</title><script>var a=1</script></head><body><nav>Home | About</nav><main>${body}</main><footer>© 2026 State</footer></body></html>`;
const LONG = "The state nomination program for skilled migration. Applications are assessed in the order received. Occupation lists are published by the state each program year. Eligibility depends on the published criteria for each subclass and the applicant's occupation and residence. ";
const BASE = page(`<h1>Skilled migration</h1><p>${LONG}</p><p>The 2025-26 program is closed to new registrations.</p>`);
const CHANGED = page(`<h1>Skilled migration</h1><p>${LONG}</p><p>The 2026-27 program is open to new registrations from 1 November.</p>`);

async function main() {
  const { extractMainText, normalise, hashText, summariseDiff, snippetOf } = await import("../lib/state-monitor/extract");
  const { runStateMonitor, FAILURE_ALERT_AFTER } = await import("../lib/state-monitor/run");
  const { snapshotFromRows, changeIsPending } = await import("../lib/state-monitor/status");
  type PageRow = import("../lib/state-monitor/store").PageRow;
  type RunRow = import("../lib/state-monitor/store").RunRow;

  console.log("1. text, hash, diff");
  const text = normalise(extractMainText(BASE));
  t("main text only: no navigation, script or footer", /skilled migration/.test(text) && !/home \| about|var a=1|© 2026/.test(text));
  t("markup, whitespace and case are not changes", hashText(normalise(extractMainText(page(`<h1>SKILLED   MIGRATION</h1>\n\n<p>${LONG.toUpperCase()}</p><div><p>The 2025-26   program is closed to new registrations.</p></div>`)))) === hashText(text));
  t("a wording change is a change", hashText(normalise(extractMainText(CHANGED))) !== hashText(text));
  const diff = summariseDiff(text, normalise(extractMainText(CHANGED)));
  t("the diff summary names the lines added and removed", /1 line\(s\) added, 1 removed/.test(diff) && /\+ the 2026-27 program is open/.test(diff) && /- the 2025-26 program is closed/.test(diff), diff);
  t("a short snippet is kept", snippetOf(text).length <= 280 && snippetOf(text).startsWith("skilled migration"));

  // an in-memory store with the same contract as the SQL one
  const mkStore = () => {
    const rows = new Map<string, PageRow>();
    const runs: Array<RunRow & { id: string }> = [];
    let broken = false;
    return {
      runs,
      rows,
      breakIt: () => { broken = true; },
      store: {
        getPage: async (s: string, u: string) => { if (broken) throw new Error('relation "state_page_monitor" does not exist'); return rows.get(`${s}|${u}`) ?? null; },
        savePage: async (r: PageRow) => { rows.set(`${r.state}|${r.url}`, { ...r }); },
        listPages: async () => [...rows.values()],
        markApplied: async (s: string, at: Date) => { let n = 0; for (const r of rows.values()) if (r.state === s && r.changeDetectedAt) { r.changeAppliedAt = at; n++; } return n; },
        insertRun: async (r: RunRow) => { runs.push({ ...r, id: String(runs.length) }); },
        lastRuns: async () => runs,
      },
    };
  };
  const PAGES = [{ state: "NSW", url: "https://nsw.example/a" }, { state: "QLD", url: "https://qld.example/b" }] as const;
  const mkWeb = (initial: Record<string, string | number | Error>) => {
    const web: Record<string, string | number | Error> = { ...initial };
    return { web, fetchPage: async (u: string) => { const v = web[u]; if (v instanceof Error) throw v; if (typeof v === "number") return { status: v, body: "" }; return { status: 200, body: String(v) }; } };
  };
  const mails: Array<{ kind: string; subject: string; text: string }> = [];
  let mailOk = true;
  const sendAlert = async (m: { kind: "change" | "failure"; subject: string; text: string }) => { if (!mailOk) return false; mails.push(m); return true; };
  let clock = Date.parse("2026-10-12T20:00:00Z");
  const now = () => new Date((clock += 3_600_000));
  const run = (h: ReturnType<typeof mkStore>, w: ReturnType<typeof mkWeb>, trigger: "cron" | "manual" | "test" = "test") => runStateMonitor({ trigger, pages: PAGES, store: h.store, fetchPage: w.fetchPage, sendAlert, now });

  console.log("\n2. unchanged -> no alert; changed -> one alert");
  {
    const h = mkStore();
    const w = mkWeb({ [PAGES[0].url]: BASE, [PAGES[1].url]: BASE });
    mails.length = 0;
    let r = await run(h, w);
    t("first run: both pages baselined, no alert", r.baselined.length === 2 && r.changed.length === 0 && mails.length === 0);
    r = await run(h, w);
    t("second run, nothing changed: no alert", r.unchanged === 2 && r.changed.length === 0 && mails.length === 0);
    w.web[PAGES[0].url] = page(`<h1>Skilled   migration</h1><p>${LONG.toUpperCase()}</p><p>The 2025-26 program is closed to new registrations.</p>`);
    r = await run(h, w);
    t("only markup / case differ: no alert", r.changed.length === 0 && mails.length === 0);
    w.web[PAGES[0].url] = CHANGED;
    r = await run(h, w);
    t("a changed page: exactly one alert", r.changed.length === 1 && mails.length === 1 && r.alertsSent === 1);
    const m = mails[0];
    t("the alert lists the state, the URL, what changed and the source file to replace", /NSW/.test(m.subject) && m.text.includes(PAGES[0].url) && /\+ the 2026-27 program is open/.test(m.text) && /- the 2025-26 program is closed/.test(m.text) && /data\/knowledge\/State Immigrations\/NSW\//.test(m.text), m.text.slice(0, 400));
    t("the alert says nothing was changed automatically", /Nothing was changed automatically/.test(m.text));
    r = await run(h, w);
    t("the next run with the page unchanged: no second alert", r.changed.length === 0 && mails.length === 1);
    t("the change is stored as pending, with hash, snippet and diff", [...h.rows.values()].some((x) => x.state === "NSW" && changeIsPending(x) && !!x.contentHash && !!x.snippet && !!x.changeSummary));
    // two pages change in one run: one email
    w.web[PAGES[0].url] = BASE;
    w.web[PAGES[1].url] = CHANGED;
    mails.length = 0;
    r = await run(h, w);
    t("two pages changed in one run: one email listing both", mails.length === 1 && r.changed.length === 2 && /NSW/.test(mails[0].text) && /QLD/.test(mails[0].text));
    // email failure is retried, not lost
    w.web[PAGES[0].url] = CHANGED;
    mails.length = 0;
    mailOk = false;
    r = await run(h, w);
    t("an email that could not be sent is not counted as sent", mails.length === 0 && r.alertsSent === 0);
    mailOk = true;
    r = await run(h, w);
    t("...and is sent by the next run, once", mails.length === 1 && r.changed.length >= 1);
    r = await run(h, w);
    t("...then not again", mails.length === 1);
  }

  console.log("\n3. fetch failures -> a single alert");
  {
    const h = mkStore();
    const w = mkWeb({ [PAGES[0].url]: BASE, [PAGES[1].url]: BASE });
    mails.length = 0;
    await run(h, w);
    w.web[PAGES[0].url] = 503;
    for (let i = 1; i < FAILURE_ALERT_AFTER; i++) await run(h, w);
    t(`${FAILURE_ALERT_AFTER - 1} failures in a row: no alert yet`, mails.length === 0);
    let r = await run(h, w);
    t(`failure ${FAILURE_ALERT_AFTER}: ONE failure alert naming the page and the error`, mails.length === 1 && mails[0].kind === "failure" && mails[0].text.includes(PAGES[0].url) && /HTTP 503/.test(mails[0].text) && r.failed.length === 1);
    await run(h, w);
    await run(h, w);
    await run(h, w);
    t("further failed runs: no more alerts (not one per run)", mails.length === 1);
    w.web[PAGES[0].url] = BASE;
    r = await run(h, w);
    t("a success resets the count and sends nothing", r.failed.length === 0 && mails.length === 1 && [...h.rows.values()].find((x) => x.url === PAGES[0].url)!.consecutiveFailures === 0);
    w.web[PAGES[0].url] = new Error("fetch failed");
    for (let i = 0; i < FAILURE_ALERT_AFTER; i++) await run(h, w);
    t("failing again later: one new alert", mails.length === 2);
    // several pages failing in the same run: one email; empty page and thrown errors count
    const h2 = mkStore();
    const w2 = mkWeb({ [PAGES[0].url]: BASE, [PAGES[1].url]: BASE });
    mails.length = 0;
    await run(h2, w2);
    w2.web[PAGES[0].url] = page("<p>Please enable JavaScript.</p>");
    w2.web[PAGES[1].url] = new Error("timeout");
    for (let i = 0; i < FAILURE_ALERT_AFTER; i++) await run(h2, w2);
    t("two pages failing together (an empty page, a timeout): one email for both", mails.length === 1 && /too little text/.test(mails[0].text) && /timeout/.test(mails[0].text));
  }

  console.log("\n4. logs, storage failure, no data changes");
  {
    const h = mkStore();
    const w = mkWeb({ [PAGES[0].url]: BASE, [PAGES[1].url]: 404 });
    await run(h, w, "manual");
    await run(h, w, "cron");
    t("every run is logged (trigger, counts)", h.runs.length === 2 && h.runs[0].trigger === "manual" && h.runs[1].trigger === "cron" && h.runs[0].pagesChecked === 2 && h.runs[0].pagesFailed === 1);
    const h3 = mkStore();
    h3.breakIt();
    mails.length = 0;
    const r = await run(h3, mkWeb({}));
    t("a storage failure (tables missing) is reported by email and in the summary", !!r.error && /does not exist/.test(r.error) && mails.length === 1 && /run failed/.test(mails[0].subject));
  }
  const src = ["lib/state-monitor/run.ts", "lib/state-monitor/extract.ts", "lib/state-monitor/store.ts", "lib/state-monitor/status.ts", "lib/state-monitor/alert.ts", "lib/state-monitor/pages.ts"].map((f) => readFileSync(f, "utf8")).join("\n");
  t("the monitor writes no file and imports no setter of state data (state-rules-config is only read for the source file names)", !/writeFile|appendFile|createWriteStream/.test(src) && !/state-nomination-status|state-sponsorship|stateNominationConfig\.(update|upsert|create)|stateIntelligence\.(update|upsert|create)/.test(src));

  console.log("\n5. the note: unapplied change or no successful check for 14 days");
  const { stateDataFlag, buildStateInfos } = await import("../lib/reports/report-states");
  const D = (s: string) => new Date(`${s}T00:00:00Z`);
  t("verified 2026-10-11, nothing detected, seen 2026-10-12: no note", stateDataFlag({ verified: "2026-10-11", monitor: { pendingChangeAt: null, lastSuccessAt: "2026-10-12T20:00:00Z" }, now: D("2026-10-20") }) === null);
  t("a change detected after the verification and not applied: note (reason change)", stateDataFlag({ verified: "2026-10-11", monitor: { pendingChangeAt: "2026-10-13T20:00:00Z", lastSuccessAt: "2026-10-13T20:00:00Z" }, now: D("2026-10-14") })?.reason === "change");
  t("a change older than the verification date counts as applied: no note", stateDataFlag({ verified: "2026-10-20", monitor: { pendingChangeAt: "2026-10-13T20:00:00Z", lastSuccessAt: "2026-10-21T00:00:00Z" }, now: D("2026-10-22") }) === null);
  t("monitor last succeeded 14 days ago: no note; 15 days ago: note (reason monitor)", stateDataFlag({ verified: "2026-09-01", monitor: { pendingChangeAt: null, lastSuccessAt: "2026-10-01T00:00:00Z" }, now: D("2026-10-15") }) === null && stateDataFlag({ verified: "2026-09-01", monitor: { pendingChangeAt: null, lastSuccessAt: "2026-10-01T00:00:00Z" }, now: D("2026-10-16") })?.reason === "monitor");
  t("no monitor data at all: the date the data was verified by hand stands in (14 days)", stateDataFlag({ verified: "2026-10-11", monitor: null, now: D("2026-10-25") }) === null && stateDataFlag({ verified: "2026-10-11", monitor: null, now: D("2026-10-26") })?.reason === "monitor");
  t("data older than 30 days but monitored successfully last week: NOT flagged (the old age rule is gone)", stateDataFlag({ verified: "2026-08-01", monitor: { pendingChangeAt: null, lastSuccessAt: "2026-10-10T00:00:00Z" }, now: D("2026-10-14") }) === null);
  {
    const h = mkStore();
    const w = mkWeb({ [PAGES[0].url]: BASE, [PAGES[1].url]: BASE });
    await run(h, w);
    w.web[PAGES[0].url] = CHANGED;
    await run(h, w);
    let snap = snapshotFromRows([...h.rows.values()]);
    t("snapshot: NSW has a pending change, QLD none", !!snap.NSW.pendingChangeAt && snap.QLD.pendingChangeAt === null);
    await h.store.markApplied("NSW", new Date(clock + 60_000));
    snap = snapshotFromRows([...h.rows.values()]);
    t("'Mark applied' clears it (and changes no report data)", snap.NSW.pendingChangeAt === null);
    t("one page that never succeeded makes the state's last success unknown", snapshotFromRows([{ ...[...h.rows.values()][0], lastSuccessAt: null }]).NSW.lastSuccessAt === null);
  }
  const { runReadinessEngine } = await import("../src/lib/readiness-engine");
  const { buildReportView } = await import("../lib/reports/report-view");
  const { REVIEW_PERSONAS } = await import("./render-persona-pdfs");
  const base = REVIEW_PERSONAS["reference-se-au"] as Record<string, unknown>;
  const asOf = D("2026-10-14");
  for (const L of ["en", "tr", "zh-Hans"] as const) {
    const report = JSON.parse(JSON.stringify(runReadinessEngine({ ...base, locale: L, targetVisa: "491", preferredPathway: "491" } as never)));
    const infos = (monitor: Parameters<typeof buildStateInfos>[4]) => buildStateInfos(report, String(base.occupation), L, asOf, monitor);
    const flagged = (monitor: Parameters<typeof buildStateInfos>[4]) => infos(monitor).filter((s) => s.staleNote).map((s) => s.code);
    const ok = { pendingChangeAt: null, lastSuccessAt: "2026-10-13T20:00:00Z" };
    const all = Object.fromEntries(["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"].map((c) => [c, ok]));
    t(`${L}: monitor healthy, nothing detected: no state carries the note`, flagged(all).length === 0);
    const withChange = { ...all, NSW: { pendingChangeAt: "2026-10-13T20:00:00Z", lastSuccessAt: "2026-10-13T20:00:00Z" } };
    const f = flagged(withChange);
    const nsw = infos(withChange).find((s) => s.code === "NSW")!;
    t(`${L}: an unapplied NSW change: only NSW carries the note, with "since 2026-10-11" and the detection date`, f.length === 1 && f[0] === "NSW" && nsw.staleNote.includes("2026-10-11") && nsw.staleNote.includes("2026-10-13"), nsw.staleNote);
    t(`${L}: the note is in the report's own language`, L === "en" ? /Data may have changed since 2026-10-11/.test(nsw.staleNote) : L === "tr" ? /değişmiş olabilir/.test(nsw.staleNote) : /可能已变化/.test(nsw.staleNote));
    const stale = infos({ ...all, WA: { pendingChangeAt: null, lastSuccessAt: "2026-09-20T00:00:00Z" } });
    t(`${L}: WA data verified 2026-10-11 stays unflagged while the monitor's last success (2026-09-20) is older than the verification date`, stale.find((s) => s.code === "WA")!.staleNote === "");
    const farFuture = buildStateInfos(report, String(base.occupation), L, D("2026-10-30"), all);
    t(`${L}: 17 days later with the last success 2026-10-13 and verification 2026-10-11: all eight carry the "monitor has not run" note`, farFuture.every((s) => !!s.staleNote) && /monitor|izleyici|监测/.test(farFuture[0].staleNote), farFuture[0].staleNote);
    const view = buildReportView({ report, locale: L, profile: { name: "T", occupation: String(base.occupation), occupationRaw: String(base.occupation) }, dateText: "", asOf, stateMonitor: withChange });
    const sec = view.sections.find((s) => s.id === "states")!;
    const noted = sec.blocks.filter((b) => b.kind === "kv" && b.rows.some(([, v]) => /2026-10-13/.test(v))).length;
    t(`${L}: in the rendered report exactly one state block shows the note`, noted === 1, String(noted));
  }

  console.log("\n6. cron, schedule, admin, SQL");
  const { GET } = await import("../app/api/cron/state-monitor/route");
  delete process.env.CRON_SECRET;
  t("cron route: no CRON_SECRET configured -> 500", (await GET(new Request("http://x/api/cron/state-monitor"))).status === 500);
  process.env.CRON_SECRET = "s3cret";
  t("cron route: no / wrong bearer token -> 401", (await GET(new Request("http://x/api/cron/state-monitor"))).status === 401 && (await GET(new Request("http://x/api/cron/state-monitor", { headers: { authorization: "Bearer nope" } }))).status === 401);
  const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { crons: Array<{ path: string; schedule: string }> };
  const cron = vercel.crons.find((c) => c.path === "/api/cron/state-monitor");
  t("vercel.json: a weekly cron (once a week, on one weekday)", !!cron && /^\d+ \d+ \* \* \d$/.test(cron.schedule), cron?.schedule);
  const actions = readFileSync("app/[locale]/(main)/admin/states/monitor-actions.ts", "utf8");
  t("admin panel: a manual run and a 'mark applied' action, both checking the admin session first", /^"use server";/.test(actions) && (actions.match(/isAdminAuthenticated\(\)/g) ?? []).length === 2 && /runStateMonitor\(\{ trigger: "manual" \}\)/.test(actions));
  t("the admin States page shows the monitor panel", /<MonitorPanel \/>/.test(readFileSync("app/[locale]/(main)/admin/states/page.tsx", "utf8")));
  const sql = readFileSync("prisma/manual-migrations/2026-10-11-create-state-page-monitor.sql", "utf8");
  t("SQL: idempotent CREATE TABLE IF NOT EXISTS for the two new tables only, one transaction, no DROP / ALTER", /CREATE TABLE IF NOT EXISTS state_page_monitor/.test(sql) && /CREATE TABLE IF NOT EXISTS state_monitor_runs/.test(sql) && /BEGIN;[\s\S]*COMMIT;/.test(sql) && !/\b(DROP|ALTER|TRUNCATE|DELETE)\b/i.test(sql.replace(/--.*$/gm, "")));
  t("schema.prisma declares both tables (so `prisma db push` never proposes dropping them)", /model StatePageMonitor[\s\S]*@@map\("state_page_monitor"\)/.test(readFileSync("prisma/schema.prisma", "utf8")) && /model StateMonitorRun[\s\S]*@@map\("state_monitor_runs"\)/.test(readFileSync("prisma/schema.prisma", "utf8")));
  const pages = await import("../lib/state-monitor/pages");
  t("every state has at least one monitored page and a source file (or web-page note) to replace", pages.STATE_CODES.every((c) => pages.MONITORED_PAGES.some((p) => p.state === c) && pages.sourceFilesFor(c).length > 0));

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
