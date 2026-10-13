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
  const mon = await import("../lib/state-monitor/run");
  const { runStateMonitor, FAILURE_ALERT_AFTER } = mon;
  const { snapshotFromRows, changeIsPending } = await import("../lib/state-monitor/status");
  type PageRow = import("../lib/state-monitor/store").PageRow;
  type RunRow = import("../lib/state-monitor/store").RunRow;
  type RunResult = import("../lib/state-monitor/store").RunResult;

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
    const events: string[] = [];
    return {
      runs,
      rows,
      events,
      breakIt: () => { broken = true; },
      store: {
        getPage: async (s: string, u: string) => { if (broken) throw new Error('relation "state_page_monitor" does not exist'); return rows.get(`${s}|${u}`) ?? null; },
        savePage: async (r: PageRow) => { rows.set(`${r.state}|${r.url}`, { ...r }); },
        listPages: async () => [...rows.values()],
        markApplied: async (s: string, at: Date) => { let n = 0; for (const r of rows.values()) if (r.state === s && r.changeDetectedAt) { r.changeAppliedAt = at; n++; } return n; },
        startRun: async (startedAt: Date, trigger: string) => { if (broken) throw new Error('relation "state_monitor_runs" does not exist'); events.push("startRun"); runs.push({ id: String(runs.length), startedAt, finishedAt: null, trigger, pagesChecked: 0, pagesChanged: 0, pagesFailed: 0, alertsSent: 0, detail: "running", error: null }); return String(runs.length - 1); },
        finishRun: async (id: string, r: RunResult) => { events.push("finishRun"); Object.assign(runs[Number(id)], r); },
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
    t("every run is logged (trigger, counts, finished)", h.runs.length === 2 && h.runs[0].trigger === "manual" && h.runs[1].trigger === "cron" && h.runs[0].pagesChecked === 2 && h.runs[0].pagesFailed === 1 && !!h.runs[0].finishedAt && !!h.runs[1].finishedAt);
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


  console.log("\n7. a run always finishes and logs: timeouts, partial runs, failure classes, headers");
  {
    // the run row is written BEFORE any page is fetched
    const h = mkStore();
    const order: string[] = [];
    const w = mkWeb({ [PAGES[0].url]: BASE, [PAGES[1].url]: BASE });
    await runStateMonitor({ trigger: "manual", pages: PAGES, store: h.store, fetchPage: async (u) => { order.push(`fetch:${h.events.join(",")}`); return w.fetchPage(u); }, sendAlert, now });
    t("the run row is written before the first page is fetched, and updated at the end", order.every((o) => o.startsWith("fetch:startRun")) && h.events.join(",") === "startRun,finishRun" && !!h.runs[0].finishedAt && h.runs[0].detail !== "running");
    // a hung page: the run still finishes, the others are processed, the run is logged
    const h2 = mkStore();
    const hung = new Promise<never>(() => undefined);
    const started = Date.now();
    mails.length = 0;
    const r = await runStateMonitor({ trigger: "cron", pages: PAGES, store: h2.store, fetchPage: async (u) => (u === PAGES[0].url ? hung : { status: 200, body: BASE }), sendAlert, now, pageTimeoutMs: 40 });
    t("a page that never answers times out per page: the run finishes quickly, the other page is stored", Date.now() - started < 3000 && r.failed.length === 1 && r.failed[0].cls === "network" && /no answer within/.test(r.failed[0].error) && r.baselined.length === 1);
    t("...and the partial run is logged (finished, 1 checked ok, 1 failed)", !!h2.runs[0].finishedAt && h2.runs[0].pagesChecked === 2 && h2.runs[0].pagesFailed === 1 && /\[network\]/.test(h2.runs[0].detail));
    // the time budget: 10 pages, 2 at a time, a clock that advances 10 s per page; the budget lets only some start; the rest go first next time
    const ten = Array.from({ length: 10 }, (_, i) => ({ state: "NSW" as const, url: `https://nsw.example/p${i}` }));
    const h3 = mkStore();
    let ms = 0;
    const body = (u: string) => page(`<h1>${u}</h1><p>${LONG}</p>`);
    const fetched1: string[] = [];
    const r1 = await runStateMonitor({ trigger: "cron", pages: ten, store: h3.store, fetchPage: async (u) => { fetched1.push(u); ms += 10_000; return { status: 200, body: body(u) }; }, sendAlert, now, nowMs: () => ms, budgetMs: 35_000, concurrency: 1 });
    t("the total time budget stops new pages from starting; the rest are reported as skipped", r1.checked === 4 && r1.skipped.length === 6 && !!h3.runs[0].finishedAt && /skipped/.test(h3.runs[0].detail), `${r1.checked} checked, ${r1.skipped.length} skipped`);
    ms = 0;
    const fetched2: string[] = [];
    const r2 = await runStateMonitor({ trigger: "cron", pages: ten, store: h3.store, fetchPage: async (u) => { fetched2.push(u); ms += 10_000; return { status: 200, body: body(u) }; }, sendAlert, now, nowMs: () => ms, budgetMs: 35_000, concurrency: 1 });
    t("the next run starts with the pages the budget did not reach (never starved)", fetched2.slice(0, 4).every((u) => !fetched1.includes(u)) && r2.checked === 4, fetched2.slice(0, 4).join(","));
    // a failure in the middle of a run (an email provider that throws) still finishes and logs the run
    const h4 = mkStore();
    await runStateMonitor({ trigger: "manual", pages: PAGES, store: h4.store, fetchPage: mkWeb({ [PAGES[0].url]: BASE, [PAGES[1].url]: BASE }).fetchPage, sendAlert, now });
    const r4 = await runStateMonitor({ trigger: "manual", pages: PAGES, store: h4.store, fetchPage: mkWeb({ [PAGES[0].url]: CHANGED, [PAGES[1].url]: BASE }).fetchPage, sendAlert: async () => { throw new Error("provider down"); }, now });
    t("an alert that throws: the run is still logged as finished, with the error", !!h4.runs[1].finishedAt && !!r4.error && /provider down/.test(r4.error) && h4.runs[1].error === r4.error);
    t("maxDuration is explicit (60 s) on the cron route and the admin page, and budget + page timeout stay under it", /export const maxDuration = 60;/.test(readFileSync("app/api/cron/state-monitor/route.ts", "utf8")) && /export const maxDuration = 60;/.test(readFileSync("app/[locale]/(main)/admin/states/page.tsx", "utf8")) && mon.RUN_BUDGET_MS + mon.PAGE_TIMEOUT_MS < mon.MONITOR_MAX_DURATION_S * 1000, `${mon.RUN_BUDGET_MS}+${mon.PAGE_TIMEOUT_MS}`);
  }
  {
    // failure classes
    const cases: Array<[string, string | number | Error, string]> = [["403", 403, "blocked"], ["429", 429, "blocked"], ["404", 404, "not_found"], ["410", 410, "not_found"], ["500", 500, "other"], ["thrown", new Error("fetch failed"), "network"], ["empty page", page("<p>hi</p>"), "other"]];
    for (const [label, v, want] of cases) {
      const h = mkStore();
      const r = await runStateMonitor({ trigger: "test", pages: [PAGES[0]], store: h.store, fetchPage: mkWeb({ [PAGES[0].url]: v }).fetchPage, sendAlert, now });
      const row = [...h.rows.values()][0];
      t(`failure class: ${label} -> ${want}`, r.failed[0]?.cls === want && /^(blocked|not_found|network|other): /.test(row.lastError ?? "") && (row.lastError ?? "").startsWith(`${want}: `), row.lastError ?? "");
    }
    const { decodeFailure, FAILURE_CLASS_LABEL } = await import("../lib/state-monitor/failure");
    t("labels: blocked by site / not found / network / timeout", FAILURE_CLASS_LABEL.blocked === "blocked by site" && FAILURE_CLASS_LABEL.not_found === "not found" && FAILURE_CLASS_LABEL.network === "network / timeout" && decodeFailure("blocked: HTTP 403")?.label === "blocked by site" && decodeFailure("not_found: HTTP 404")?.message === "HTTP 404");
    // the class is in the alert email and in the admin table
    const h = mkStore();
    const w = mkWeb({ [PAGES[0].url]: 403, [PAGES[1].url]: 404 });
    mails.length = 0;
    for (let i = 0; i < FAILURE_ALERT_AFTER; i++) await runStateMonitor({ trigger: "test", pages: PAGES, store: h.store, fetchPage: w.fetchPage, sendAlert, now });
    t("the failure email shows each page's class", mails.length === 1 && /class: blocked by site/.test(mails[0].text) && /class: not found/.test(mails[0].text), mails[0]?.text.slice(0, 300));
    const panel = readFileSync("app/[locale]/(main)/admin/states/monitor-panel.tsx", "utf8");
    t("the admin table shows the class; the run log shows unfinished runs", /decodeFailure\(p\.lastError\)/.test(panel) && /data-failure-class/.test(panel) && /NOT FINISHED/.test(panel));
    // browser-like request
    const seen: Array<{ url: string; init: RequestInit }> = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (u: RequestInfo | URL, init?: RequestInit) => { seen.push({ url: String(u), init: init ?? {} }); return new Response("<main>x</main>", { status: 200 }); }) as typeof fetch;
    await mon.defaultFetchPage("https://example.test/p");
    globalThis.fetch = realFetch;
    const hd = (seen[0]?.init.headers ?? {}) as Record<string, string>;
    t("requests are browser-like (Chrome user agent, Accept, Accept-Language) and follow redirects", /Mozilla\/5\.0 .*Chrome\/\d+/.test(hd["user-agent"]) && /text\/html/.test(hd.accept) && /en-AU/.test(hd["accept-language"]) && seen[0]?.init.redirect === "follow" && !!seen[0]?.init.signal);
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
