import { Button } from "@/components/ui/button";
import { changeIsPending } from "@/lib/state-monitor/status";
import { prismaMonitorStore, type PageRow } from "@/lib/state-monitor/store";
import { markStateAppliedAction, runMonitorNowAction } from "./monitor-actions";

const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 16).replace("T", " ") + " UTC" : "never");

/** The state-page change monitor: last runs, every monitored page, unapplied changes, a manual run and a "mark applied" button per state. Admin page only. */
export async function MonitorPanel() {
  let pages: PageRow[] = [];
  let runs: Awaited<ReturnType<typeof prismaMonitorStore.lastRuns>> = [];
  let error: string | null = null;
  try {
    [pages, runs] = await Promise.all([prismaMonitorStore.listPages(), prismaMonitorStore.lastRuns(8)]);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const pending = [...new Set(pages.filter(changeIsPending).map((p) => p.state))];

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5" data-testid="state-monitor-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">State page monitor</h2>
          <p className="text-sm text-muted-foreground">Fetches each state&apos;s official pages weekly (Vercel cron) and emails ADMIN_NOTIFICATION_EMAIL when a page&apos;s content changes. It never changes report data.</p>
        </div>
        <form action={runMonitorNowAction}>
          <Button type="submit">Run the monitor now</Button>
        </form>
      </div>

      {error ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          The monitor tables are not available yet ({error.slice(0, 160)}). Run <code>prisma/manual-migrations/2026-10-11-create-state-page-monitor.sql</code> in Neon, then reload.
        </p>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">Changes detected and not applied: {pending.join(", ")}</p>
              <p>Reports show &quot;data may have changed since&quot; for these states until you apply the change and press Mark applied.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {pending.map((state) => (
                  <form key={state} action={markStateAppliedAction}>
                    <input type="hidden" name="state" value={state} />
                    <Button type="submit" size="sm" variant="outline">Mark {state} applied</Button>
                  </form>
                ))}
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-xs">
              <thead>
                <tr className="border-b text-left text-slate-600">
                  <th className="py-2 pr-3">State</th>
                  <th className="pr-3">Page</th>
                  <th className="pr-3">Last success</th>
                  <th className="pr-3">Failures in a row</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {pages.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-3 text-slate-600">No page has been checked yet. Run the monitor once to store the baseline.</td>
                  </tr>
                )}
                {pages.map((p) => (
                  <tr key={`${p.state}-${p.url}`} className="border-b align-top">
                    <td className="py-2 pr-3 font-medium">{p.state}</td>
                    <td className="pr-3 break-all">{p.url}</td>
                    <td className="pr-3">{fmt(p.lastSuccessAt)}</td>
                    <td className="pr-3">{p.consecutiveFailures}{p.lastError ? ` (${p.lastError})` : ""}</td>
                    <td>{changeIsPending(p) ? `detected ${fmt(p.changeDetectedAt)}` : p.changeDetectedAt ? "applied" : "none"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold">Run log</h3>
            <ul className="space-y-1 text-xs text-slate-700">
              {runs.length === 0 && <li>No runs yet.</li>}
              {runs.map((r) => (
                <li key={r.id}>
                  {fmt(r.startedAt)} · {r.trigger} · checked {r.pagesChecked}, changed {r.pagesChanged}, failed {r.pagesFailed}, alerts {r.alertsSent}
                  {r.error ? ` · error: ${r.error.slice(0, 120)}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
