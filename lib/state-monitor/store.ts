/**
 * Storage for the state-page change monitor. `MonitorStore` is the interface the run logic uses; `prismaMonitorStore` is the production one
 * (raw SQL on state_page_monitor / state_monitor_runs, created by prisma/manual-migrations/2026-10-11-create-state-page-monitor.sql).
 */
import { prisma } from "@/lib/prisma";

export type PageRow = {
  state: string;
  url: string;
  contentHash: string | null;
  snippet: string | null;
  normalizedText: string | null;
  contentLength: number | null;
  lastCheckedAt: Date | null;
  lastSuccessAt: Date | null;
  changeDetectedAt: Date | null;
  changeSummary: string | null;
  changeAlertedAt: Date | null;
  changeAppliedAt: Date | null;
  consecutiveFailures: number;
  lastError: string | null;
  failureAlertedAt: Date | null;
};

export type RunRow = { startedAt: Date; finishedAt: Date; trigger: string; pagesChecked: number; pagesChanged: number; pagesFailed: number; alertsSent: number; detail: string; error: string | null };

export interface MonitorStore {
  getPage(state: string, url: string): Promise<PageRow | null>;
  savePage(row: PageRow): Promise<void>;
  listPages(): Promise<PageRow[]>;
  markApplied(state: string, at: Date): Promise<number>;
  insertRun(run: RunRow): Promise<void>;
  lastRuns(limit: number): Promise<Array<RunRow & { id: string }>>;
}

const d = (v: unknown): Date | null => (v ? new Date(v as string) : null);
const toRow = (r: Record<string, unknown>): PageRow => ({
  state: String(r.state_code),
  url: String(r.url),
  contentHash: (r.content_hash as string) ?? null,
  snippet: (r.snippet as string) ?? null,
  normalizedText: (r.normalized_text as string) ?? null,
  contentLength: r.content_length === null || r.content_length === undefined ? null : Number(r.content_length),
  lastCheckedAt: d(r.last_checked_at),
  lastSuccessAt: d(r.last_success_at),
  changeDetectedAt: d(r.change_detected_at),
  changeSummary: (r.change_summary as string) ?? null,
  changeAlertedAt: d(r.change_alerted_at),
  changeAppliedAt: d(r.change_applied_at),
  consecutiveFailures: Number(r.consecutive_failures ?? 0),
  lastError: (r.last_error as string) ?? null,
  failureAlertedAt: d(r.failure_alerted_at),
});

export const prismaMonitorStore: MonitorStore = {
  async getPage(state, url) {
    const rows = (await prisma.$queryRawUnsafe(`SELECT * FROM state_page_monitor WHERE state_code = $1 AND url = $2 LIMIT 1`, state, url)) as Array<Record<string, unknown>>;
    return rows[0] ? toRow(rows[0]) : null;
  },
  async savePage(r) {
    await prisma.$queryRawUnsafe(
      `INSERT INTO state_page_monitor (state_code, url, content_hash, snippet, normalized_text, content_length, last_checked_at, last_success_at, change_detected_at, change_summary, change_alerted_at, change_applied_at, consecutive_failures, last_error, failure_alerted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (state_code, url) DO UPDATE SET content_hash = EXCLUDED.content_hash, snippet = EXCLUDED.snippet, normalized_text = EXCLUDED.normalized_text, content_length = EXCLUDED.content_length,
         last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at, change_detected_at = EXCLUDED.change_detected_at, change_summary = EXCLUDED.change_summary, change_alerted_at = EXCLUDED.change_alerted_at,
         change_applied_at = EXCLUDED.change_applied_at, consecutive_failures = EXCLUDED.consecutive_failures, last_error = EXCLUDED.last_error, failure_alerted_at = EXCLUDED.failure_alerted_at`,
      r.state, r.url, r.contentHash, r.snippet, r.normalizedText, r.contentLength, r.lastCheckedAt, r.lastSuccessAt, r.changeDetectedAt, r.changeSummary, r.changeAlertedAt, r.changeAppliedAt, r.consecutiveFailures, r.lastError, r.failureAlertedAt,
    );
  },
  async listPages() {
    const rows = (await prisma.$queryRawUnsafe(`SELECT * FROM state_page_monitor ORDER BY state_code, url`)) as Array<Record<string, unknown>>;
    return rows.filter((r) => typeof r.state_code === "string").map(toRow);
  },
  async markApplied(state, at) {
    const rows = (await prisma.$queryRawUnsafe(`UPDATE state_page_monitor SET change_applied_at = $2 WHERE state_code = $1 AND change_detected_at IS NOT NULL RETURNING id`, state, at)) as unknown[];
    return rows.length;
  },
  async insertRun(run) {
    await prisma.$queryRawUnsafe(
      `INSERT INTO state_monitor_runs (started_at, finished_at, trigger, pages_checked, pages_changed, pages_failed, alerts_sent, detail, error) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      run.startedAt, run.finishedAt, run.trigger, run.pagesChecked, run.pagesChanged, run.pagesFailed, run.alertsSent, run.detail, run.error,
    );
  },
  async lastRuns(limit) {
    const rows = (await prisma.$queryRawUnsafe(`SELECT * FROM state_monitor_runs ORDER BY started_at DESC LIMIT ${Math.max(1, Math.min(50, Math.floor(limit)))}`)) as Array<Record<string, unknown>>;
    return rows.filter((r) => typeof r.trigger === "string").map((r) => ({
      id: String(r.id),
      startedAt: new Date(r.started_at as string),
      finishedAt: new Date((r.finished_at as string) ?? (r.started_at as string)),
      trigger: String(r.trigger),
      pagesChecked: Number(r.pages_checked ?? 0),
      pagesChanged: Number(r.pages_changed ?? 0),
      pagesFailed: Number(r.pages_failed ?? 0),
      alertsSent: Number(r.alerts_sent ?? 0),
      detail: String(r.detail ?? ""),
      error: (r.error as string) ?? null,
    }));
  },
};
