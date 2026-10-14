/**
 * The state-page change monitor. For every monitored official page: fetch it, take the main text, normalise it, hash it and compare with the stored
 * hash. A first sight stores a baseline (no alert). An unchanged page only refreshes its timestamps. A changed page records the change (hash, snippet,
 * diff summary) and goes into ONE admin email for the run. A page that cannot be fetched counts a failure, classified (blocked by site 403/429, not
 * found 404, network / timeout); after FAILURE_ALERT_AFTER failures in a row ONE failure email is sent for it, reset when it succeeds.
 *
 * A run always finishes and logs: the run row is written when the run STARTS and updated when it ends (also after a partial or failed run). Pages are
 * fetched concurrently, each with its own timeout, inside a total time budget well under the function's maxDuration; pages the budget did not reach are
 * skipped and go FIRST on the next run (oldest check first), so a slow site cannot starve the rest. The monitor never changes report data.
 */
import { adminMonitorUrl, buildChangeAlert, buildFailureAlert, sendMonitorAlert, type AlertMail, type ChangeItem, type FailureItem } from "./alert";
import { extractMainText, hashText, normalise, snippetOf, summariseDiff } from "./extract";
import { classifyStatus, classifyThrown, encodeFailure, type FailureClass, type PageFailure } from "./failure";
import { getAdminStateData } from "@/lib/admin-data/loader";
import { monitoredPagesFrom, type MonitoredPage } from "./pages";
import { prismaMonitorStore, type MonitorStore, type PageRow } from "./store";

/** The cron route and the admin page both declare maxDuration = 60 (the limit of every Vercel plan). */
export const MONITOR_MAX_DURATION_S = 60;
/** No new page is started after this; pages already in flight end within PAGE_TIMEOUT_MS, so a run ends well before maxDuration. */
export const RUN_BUDGET_MS = 35_000;
export const PAGE_TIMEOUT_MS = 10_000;
export const CONCURRENCY = 6;
export const FAILURE_ALERT_AFTER = 3;
export const MIN_TEXT_CHARS = 200;

export type FetchPage = (url: string) => Promise<{ status: number; body: string }>;
export type SendAlert = (mail: AlertMail) => Promise<boolean>;

/** Browser-like request: sites that refuse a bare bot user agent (403) usually answer this. Redirects are followed. */
export const BROWSER_HEADERS: Record<string, string> = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "en-AU,en;q=0.9",
  "cache-control": "no-cache",
  "upgrade-insecure-requests": "1",
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
};

export const defaultFetchPage: FetchPage = async (url) => {
  const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(PAGE_TIMEOUT_MS), headers: BROWSER_HEADERS });
  return { status: res.status, body: await res.text() };
};

export type RunSummary = {
  trigger: string;
  checked: number;
  baselined: string[];
  unchanged: number;
  changed: ChangeItem[];
  failed: Array<{ state: string; url: string; error: string; cls: FailureClass; failures: number }>;
  /** Pages the time budget did not reach; they are first in line on the next run. */
  skipped: string[];
  alertsSent: number;
  error: string | null;
};

const blank = (state: string, url: string): PageRow => ({ state, url, contentHash: null, snippet: null, normalizedText: null, contentLength: null, lastCheckedAt: null, lastSuccessAt: null, changeDetectedAt: null, changeSummary: null, changeAlertedAt: null, changeAppliedAt: null, consecutiveFailures: 0, lastError: null, failureAlertedAt: null });

/** Rejects after `ms` whatever the fetch does (a hung connection, a body that never ends), so one page can never hold the run. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no answer within ${Math.round(ms / 1000)} s`)), ms);
    p.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });
}

export async function runStateMonitor(opts: { trigger: "cron" | "manual" | "test"; pages?: readonly MonitoredPage[]; store?: MonitorStore; fetchPage?: FetchPage; sendAlert?: SendAlert; now?: () => Date; nowMs?: () => number; budgetMs?: number; pageTimeoutMs?: number; concurrency?: number } = { trigger: "manual" }): Promise<RunSummary> {
  const store = opts.store ?? prismaMonitorStore;
  const fetchPage = opts.fetchPage ?? defaultFetchPage;
  const sendAlert = opts.sendAlert ?? sendMonitorAlert;
  const now = opts.now ?? (() => new Date());
  const clock = opts.nowMs ?? Date.now;
  const budgetMs = opts.budgetMs ?? RUN_BUDGET_MS;
  const pageTimeoutMs = opts.pageTimeoutMs ?? PAGE_TIMEOUT_MS;
  // The pages are the admin's: each state's official URL and extra URLs (the static list when the data holds none).
  const pages = opts.pages ?? monitoredPagesFrom(await getAdminStateData());
  const startedAt = now();
  const t0 = clock();
  const summary: RunSummary = { trigger: opts.trigger, checked: 0, baselined: [], unchanged: 0, changed: [], failed: [], skipped: [], alertsSent: 0, error: null };
  console.log(`[state-monitor] run started trigger=${opts.trigger} pages=${pages.length} budget=${budgetMs}ms pageTimeout=${pageTimeoutMs}ms`);

  let runId: string | null = null;
  const failuresToAlert: FailureItem[] = [];
  const failureRows: PageRow[] = [];

  try {
    // The run row exists from the first moment: a function cut off later still leaves "started, never finished" in the log.
    runId = await store.startRun(startedAt, opts.trigger);
    const stored = new Map((await store.listPages()).map((r) => [`${r.state}|${r.url}`, r]));
    // Pages never checked, then the longest unchecked, go first: pages skipped by the budget are first in line next time.
    const ordered = [...pages].sort((a, b) => (stored.get(`${a.state}|${a.url}`)?.lastCheckedAt?.getTime() ?? 0) - (stored.get(`${b.state}|${b.url}`)?.lastCheckedAt?.getTime() ?? 0));

    let next = 0;
    const worker = async () => {
      while (next < ordered.length) {
        if (clock() - t0 >= budgetMs) return;
        const page = ordered[next++];
        const at = now();
        summary.checked++;
        const existing = stored.get(`${page.state}|${page.url}`) ?? blank(page.state, page.url);
        let outcome: { text: string } | { failure: PageFailure };
        try {
          const res = await withTimeout(fetchPage(page.url), pageTimeoutMs);
          if (res.status < 200 || res.status >= 300) outcome = { failure: { cls: classifyStatus(res.status), message: `HTTP ${res.status}` } };
          else {
            const text = normalise(extractMainText(res.body));
            outcome = text.length < MIN_TEXT_CHARS ? { failure: { cls: "other", message: `too little text on the page (${text.length} characters): empty or script-only` } } : { text };
          }
        } catch (e) {
          outcome = { failure: { cls: classifyThrown(), message: e instanceof Error ? e.message : String(e) } };
        }

        if ("failure" in outcome) {
          const f = outcome.failure;
          const row: PageRow = { ...existing, lastCheckedAt: at, consecutiveFailures: existing.consecutiveFailures + 1, lastError: encodeFailure(f) };
          summary.failed.push({ state: page.state, url: page.url, error: f.message, cls: f.cls, failures: row.consecutiveFailures });
          console.warn(`[state-monitor] ${page.state} ${page.url} FAILED [${f.cls}] (${row.consecutiveFailures} in a row): ${f.message}`);
          if (row.consecutiveFailures >= FAILURE_ALERT_AFTER && !row.failureAlertedAt) failuresToAlert.push({ state: page.state, url: page.url, failures: row.consecutiveFailures, error: f.message, cls: f.cls });
          await store.savePage(row);
          failureRows.push(row);
          continue;
        }

        const hash = hashText(outcome.text);
        const base = { ...existing, lastCheckedAt: at, lastSuccessAt: at, consecutiveFailures: 0, lastError: null, failureAlertedAt: null };
        if (!existing.contentHash) {
          await store.savePage({ ...base, contentHash: hash, snippet: snippetOf(outcome.text), normalizedText: outcome.text, contentLength: outcome.text.length });
          summary.baselined.push(`${page.state} ${page.url}`);
          console.log(`[state-monitor] ${page.state} ${page.url} baseline stored`);
        } else if (existing.contentHash === hash) {
          await store.savePage(base);
          summary.unchanged++;
          console.log(`[state-monitor] ${page.state} ${page.url} unchanged`);
        } else {
          await store.savePage({ ...base, contentHash: hash, snippet: snippetOf(outcome.text), normalizedText: outcome.text, contentLength: outcome.text.length, changeDetectedAt: at, changeSummary: summariseDiff(existing.normalizedText ?? "", outcome.text), changeAlertedAt: null });
          console.log(`[state-monitor] ${page.state} ${page.url} CHANGED`);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, Math.min(opts.concurrency ?? CONCURRENCY, ordered.length)) }, worker));
    summary.skipped = ordered.slice(next).map((p) => `${p.state} ${p.url}`);
    if (summary.skipped.length > 0) console.warn(`[state-monitor] time budget reached: ${summary.skipped.length} page(s) not reached, first on the next run`);

    // One email for every change not yet alerted (a change whose email failed is retried by the next run).
    const all = await store.listPages();
    const toAlert = all.filter((r) => r.changeDetectedAt && !r.changeAlertedAt);
    for (const r of toAlert) summary.changed.push({ state: r.state, url: r.url, detectedAt: r.changeDetectedAt!, summary: r.changeSummary ?? "content changed" });
    if (toAlert.length > 0 && (await sendAlert(buildChangeAlert(summary.changed, adminMonitorUrl())))) {
      summary.alertsSent++;
      for (const r of toAlert) await store.savePage({ ...r, changeAlertedAt: now() });
    }
    if (failuresToAlert.length > 0 && (await sendAlert(buildFailureAlert(failuresToAlert, adminMonitorUrl())))) {
      summary.alertsSent++;
      for (const f of failureRows.filter((r) => failuresToAlert.some((x) => x.state === r.state && x.url === r.url))) await store.savePage({ ...f, failureAlertedAt: now() });
    }
  } catch (error) {
    summary.error = error instanceof Error ? error.message : String(error);
    console.error(`[state-monitor] run failed: ${summary.error}`);
    // A storage failure (e.g. the tables were not created yet) is reported once per run, by email.
    if (await sendAlert({ kind: "failure", subject: "[LogiVisa] State page monitor run failed", text: `The state-page monitor could not complete its run:\n\n${summary.error}\n\nIf the tables do not exist yet, run prisma/manual-migrations/2026-10-11-create-state-page-monitor.sql in Neon.\nStatus: ${adminMonitorUrl()}` }).catch(() => false)) summary.alertsSent++;
  }

  console.log(`[state-monitor] run finished trigger=${opts.trigger} checked=${summary.checked} baselined=${summary.baselined.length} unchanged=${summary.unchanged} changed=${summary.changed.length} failed=${summary.failed.length} skipped=${summary.skipped.length} alerts=${summary.alertsSent} took=${clock() - t0}ms${summary.error ? ` error=${summary.error}` : ""}`);
  if (runId) {
    try {
      await store.finishRun(runId, {
        finishedAt: now(),
        pagesChecked: summary.checked,
        pagesChanged: summary.changed.length,
        pagesFailed: summary.failed.length,
        alertsSent: summary.alertsSent,
        detail: JSON.stringify({ baselined: summary.baselined, changed: summary.changed.map((c) => `${c.state} ${c.url}`), failed: summary.failed.map((f) => `${f.state} ${f.url}: [${f.cls}] ${f.error}`), skipped: summary.skipped, tookMs: clock() - t0 }).slice(0, 4000),
        error: summary.error,
      });
    } catch (error) {
      console.error(`[state-monitor] could not store the run result: ${error instanceof Error ? error.message : error}`);
    }
  }
  return summary;
}
