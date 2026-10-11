/**
 * What the report needs from the monitor, per state: the newest detected change that has not been applied yet, and the oldest last-successful check of
 * the state's pages. Pure aggregation (`snapshotFromRows`) plus a safe loader: any storage problem (table missing, no database) gives null, and the
 * report then relies on the date the state data was last verified by hand.
 */
import type { PageRow } from "./store";

export type StateMonitorState = { pendingChangeAt: string | null; lastSuccessAt: string | null };
export type StateMonitorSnapshot = Record<string, StateMonitorState>;

/** A page's change is unapplied while it is newer than the admin's "applied" mark. */
export const changeIsPending = (r: Pick<PageRow, "changeDetectedAt" | "changeAppliedAt">): boolean =>
  !!r.changeDetectedAt && (!r.changeAppliedAt || r.changeDetectedAt.getTime() > r.changeAppliedAt.getTime());

export function snapshotFromRows(rows: PageRow[]): StateMonitorSnapshot {
  const out: StateMonitorSnapshot = {};
  for (const state of new Set(rows.map((r) => r.state))) {
    const mine = rows.filter((r) => r.state === state);
    const pending = mine.filter(changeIsPending).map((r) => r.changeDetectedAt!.getTime());
    // One page that never succeeded makes the state's last successful check unknown (null): the oldest of the pages decides.
    const successes = mine.map((r) => r.lastSuccessAt?.getTime() ?? null);
    out[state] = {
      pendingChangeAt: pending.length ? new Date(Math.max(...pending)).toISOString() : null,
      lastSuccessAt: successes.some((x) => x === null) ? null : new Date(Math.min(...(successes as number[]))).toISOString(),
    };
  }
  return out;
}

export async function loadStateMonitorSnapshot(): Promise<StateMonitorSnapshot | null> {
  try {
    // Loaded on use, not at import: the PDF generator imports this file, and the database client must not be created as a side effect of that import.
    const { prisma } = await import("@/lib/prisma");
    const rows = (await prisma.$queryRawUnsafe(`SELECT state_code, last_success_at, change_detected_at, change_applied_at FROM state_page_monitor`)) as Array<Record<string, unknown>>;
    const usable = (Array.isArray(rows) ? rows : []).filter((r) => typeof r?.state_code === "string");
    if (usable.length === 0) return null;
    const d = (v: unknown) => (v ? new Date(v as string) : null);
    return snapshotFromRows(usable.map((r) => ({ state: String(r.state_code), url: "", contentHash: null, snippet: null, normalizedText: null, contentLength: null, lastCheckedAt: null, lastSuccessAt: d(r.last_success_at), changeDetectedAt: d(r.change_detected_at), changeSummary: null, changeAlertedAt: null, changeAppliedAt: d(r.change_applied_at), consecutiveFailures: 0, lastError: null, failureAlertedAt: null })));
  } catch {
    return null;
  }
}
