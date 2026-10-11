/**
 * The state-page change monitor. For every monitored official page: fetch it, take the main text, normalise it, hash it and compare with the stored
 * hash. A first sight stores a baseline (no alert). An unchanged page only refreshes its timestamps. A changed page records the change (hash, snippet,
 * diff summary) and goes into ONE admin email for the run. A page that cannot be fetched counts a failure; after FAILURE_ALERT_AFTER failures in a row
 * ONE failure email is sent for it (not one per run), and it is reset when the page succeeds. Every run is logged (console and state_monitor_runs).
 * The monitor never changes report data: it only stores what it saw and tells the admin.
 */
import { adminMonitorUrl, buildChangeAlert, buildFailureAlert, sendMonitorAlert, type AlertMail, type ChangeItem, type FailureItem } from "./alert";
import { extractMainText, hashText, normalise, snippetOf, summariseDiff } from "./extract";
import { MONITORED_PAGES, type MonitoredPage } from "./pages";
import { prismaMonitorStore, type MonitorStore, type PageRow } from "./store";

export const FAILURE_ALERT_AFTER = 3;
export const MIN_TEXT_CHARS = 200;
const FETCH_TIMEOUT_MS = 20_000;

export type FetchPage = (url: string) => Promise<{ status: number; body: string }>;
export type SendAlert = (mail: AlertMail) => Promise<boolean>;

export const defaultFetchPage: FetchPage = async (url) => {
  const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { "user-agent": "LogiVisaStateMonitor/1.0 (+https://logivisa.com)", accept: "text/html,application/xhtml+xml" } });
  return { status: res.status, body: await res.text() };
};

export type RunSummary = {
  trigger: string;
  checked: number;
  baselined: string[];
  unchanged: number;
  changed: ChangeItem[];
  failed: Array<{ state: string; url: string; error: string; failures: number }>;
  alertsSent: number;
  error: string | null;
};

const blank = (state: string, url: string): PageRow => ({ state, url, contentHash: null, snippet: null, normalizedText: null, contentLength: null, lastCheckedAt: null, lastSuccessAt: null, changeDetectedAt: null, changeSummary: null, changeAlertedAt: null, changeAppliedAt: null, consecutiveFailures: 0, lastError: null, failureAlertedAt: null });

async function inPool<T>(items: readonly T[], size: number, fn: (x: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => { while (next < items.length) await fn(items[next++]); }));
}

export async function runStateMonitor(opts: { trigger: "cron" | "manual" | "test"; pages?: readonly MonitoredPage[]; store?: MonitorStore; fetchPage?: FetchPage; sendAlert?: SendAlert; now?: () => Date } = { trigger: "manual" }): Promise<RunSummary> {
  const store = opts.store ?? prismaMonitorStore;
  const fetchPage = opts.fetchPage ?? defaultFetchPage;
  const sendAlert = opts.sendAlert ?? sendMonitorAlert;
  const now = opts.now ?? (() => new Date());
  const pages = opts.pages ?? MONITORED_PAGES;
  const startedAt = now();
  const summary: RunSummary = { trigger: opts.trigger, checked: 0, baselined: [], unchanged: 0, changed: [], failed: [], alertsSent: 0, error: null };
  console.log(`[state-monitor] run started trigger=${opts.trigger} pages=${pages.length}`);
  const failuresToAlert: FailureItem[] = [];
  const failureRows: PageRow[] = [];

  try {
    await inPool(pages, 4, async (page) => {
      const at = now();
      summary.checked++;
      const existing = (await store.getPage(page.state, page.url)) ?? blank(page.state, page.url);
      let outcome: { text: string } | { error: string };
      try {
        const res = await fetchPage(page.url);
        if (res.status < 200 || res.status >= 300) outcome = { error: `HTTP ${res.status}` };
        else {
          const text = normalise(extractMainText(res.body));
          outcome = text.length < MIN_TEXT_CHARS ? { error: `too little text on the page (${text.length} characters): blocked, empty or script-only` } : { text };
        }
      } catch (e) {
        outcome = { error: e instanceof Error ? e.message : String(e) };
      }

      if ("error" in outcome) {
        const row: PageRow = { ...existing, lastCheckedAt: at, consecutiveFailures: existing.consecutiveFailures + 1, lastError: outcome.error.slice(0, 300) };
        summary.failed.push({ state: page.state, url: page.url, error: outcome.error, failures: row.consecutiveFailures });
        console.warn(`[state-monitor] ${page.state} ${page.url} FAILED (${row.consecutiveFailures} in a row): ${outcome.error}`);
        if (row.consecutiveFailures >= FAILURE_ALERT_AFTER && !row.failureAlertedAt) failuresToAlert.push({ state: page.state, url: page.url, failures: row.consecutiveFailures, error: outcome.error });
        await store.savePage(row);
        failureRows.push(row);
        return;
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
        const row: PageRow = { ...base, contentHash: hash, snippet: snippetOf(outcome.text), normalizedText: outcome.text, contentLength: outcome.text.length, changeDetectedAt: at, changeSummary: summariseDiff(existing.normalizedText ?? "", outcome.text), changeAlertedAt: null };
        await store.savePage(row);
        console.log(`[state-monitor] ${page.state} ${page.url} CHANGED`);
      }
    });

    // One email for every change not yet alerted (a change whose email failed is retried by the next run).
    const all = await store.listPages();
    const toAlert = all.filter((r) => r.changeDetectedAt && !r.changeAlertedAt);
    for (const r of toAlert) summary.changed.push({ state: r.state, url: r.url, detectedAt: r.changeDetectedAt!, summary: r.changeSummary ?? "content changed" });
    if (toAlert.length > 0) {
      if (await sendAlert(buildChangeAlert(summary.changed, adminMonitorUrl()))) {
        summary.alertsSent++;
        for (const r of toAlert) await store.savePage({ ...r, changeAlertedAt: now() });
      }
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

  const finishedAt = now();
  console.log(`[state-monitor] run finished trigger=${opts.trigger} checked=${summary.checked} baselined=${summary.baselined.length} unchanged=${summary.unchanged} changed=${summary.changed.length} failed=${summary.failed.length} alerts=${summary.alertsSent}${summary.error ? ` error=${summary.error}` : ""}`);
  try {
    await store.insertRun({ startedAt, finishedAt, trigger: opts.trigger, pagesChecked: summary.checked, pagesChanged: summary.changed.length, pagesFailed: summary.failed.length, alertsSent: summary.alertsSent, detail: JSON.stringify({ baselined: summary.baselined, changed: summary.changed.map((c) => `${c.state} ${c.url}`), failed: summary.failed.map((f) => `${f.state} ${f.url}: ${f.error}`) }).slice(0, 4000), error: summary.error });
  } catch (error) {
    console.error(`[state-monitor] could not store the run log: ${error instanceof Error ? error.message : error}`);
  }
  return summary;
}
