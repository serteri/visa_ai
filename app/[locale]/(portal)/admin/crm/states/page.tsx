import Link from "next/link";
import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasUnreviewed } from "@/lib/admin-data/localized";
import { seedStateData } from "@/lib/admin-data/snapshot";
import { isClosedStatus } from "@/lib/admin-data/statuses";
import { prismaStateProgramStore } from "@/lib/admin-data/store-prisma";
import type { StateProgramData } from "@/lib/admin-data/types";
import { requireRole } from "@/lib/auth/rbac";
import { isMissingRelationError } from "@/lib/db/missing-relation";
import { MonitorPanel } from "./monitor-panel";

export const metadata: Metadata = {
  title: "Admin · State nomination · LogiVisa Portal",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const maxDuration = 60; // the manual monitor run keeps to a 35 s budget (lib/state-monitor/run.ts)

type PageProps = { params: Promise<{ locale: string }> };

const money = (n: number | null) => (n === null ? "—" : `AUD ${n.toLocaleString("en-AU", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2 })}`);

function ageDays(iso: string): number {
  return Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
}

function statusClass(status: string): string {
  if (isClosedStatus(status)) return "border-red-200 bg-red-50 text-red-800";
  if (status === "Check official page") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

function hasPendingTranslation(p: StateProgramData): boolean {
  return (
    hasUnreviewed(p.notes) ||
    hasUnreviewed(p.aiSummary) ||
    (p.exceptions ? hasUnreviewed(p.exceptions.text) : false) ||
    p.conditions.some((c) => hasUnreviewed(c.text)) ||
    p.scoring.specialConditions.some((c) => hasUnreviewed(c))
  );
}

export default async function AdminStatesPage({ params }: PageProps) {
  const { locale } = await params;
  await requireRole("ADMIN", locale, `/${locale}/admin/crm/states`);

  let programs: StateProgramData[] = [];
  let problem: "missing_table" | "empty" | "error" | null = null;
  let detail = "";
  try {
    programs = await prismaStateProgramStore.list();
    if (programs.length === 0) problem = "empty";
  } catch (err) {
    problem = isMissingRelationError(err, "state_programs") ? "missing_table" : "error";
    detail = err instanceof Error ? err.message.slice(0, 200) : String(err);
  }
  const rows = problem ? Object.values(seedStateData().programs) : programs;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">State nomination</h1>
        <p className="text-sm text-slate-600">
          The data you save here is what reports, the chat and the page monitor use. The admin row always wins: there is no date comparison with any other source. Every change is logged with your name.
        </p>
      </div>

      {problem === "missing_table" && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" data-testid="admin-states-missing-tables">
          <p className="font-semibold">The tables are not created yet</p>
          <p className="mt-1">
            Run <code>prisma/manual-migrations/2026-10-15-create-admin-state-data.sql</code> in Neon, then <code>npx tsx scripts/seed-admin-data.ts</code> (dry run first). Until then reports and the chat use the bundled data, which is exactly what the table below shows (read only).
          </p>
        </div>
      )}
      {problem === "empty" && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" data-testid="admin-states-empty">
          <p className="font-semibold">No state rows yet</p>
          <p className="mt-1">
            Seed them once with <code>npx tsx scripts/seed-admin-data.ts</code> (it shows a dry run first; <code>--execute</code> writes). Until then reports and the chat use the bundled data shown below (read only).
          </p>
        </div>
      )}
      {problem === "error" && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">The state data could not be read</p>
          <p className="mt-1">{detail}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All states</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm" data-testid="admin-states-table">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">State</th>
                <th className="pr-3">Status</th>
                <th className="pr-3">Year</th>
                <th className="pr-3">Opening</th>
                <th className="pr-3">Allocation 190 / 491</th>
                <th className="pr-3">Fee 190 (excl. / incl. GST)</th>
                <th className="pr-3">Last verified</th>
                <th>Translations</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const s190 = p.subclasses.find((s) => s.subclass === "190");
                const s491 = p.subclasses.find((s) => s.subclass === "491");
                const age = ageDays(p.lastVerifiedAt);
                return (
                  <tr key={p.stateCode} className="border-b align-top">
                    <td className="py-2 pr-3 font-medium">
                      {problem ? (
                        <span>{p.stateName} ({p.stateCode})</span>
                      ) : (
                        <Link href={`/${locale}/admin/crm/states/${p.stateCode}`} className="text-primary underline-offset-2 hover:underline" data-testid={`admin-state-link-${p.stateCode}`}>
                          {p.stateName} ({p.stateCode})
                        </Link>
                      )}
                    </td>
                    <td className="pr-3">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass(p.status)}`}>{p.status}</span>
                    </td>
                    <td className="pr-3">{p.programYear}</td>
                    <td className="pr-3">{p.openingDate ?? "—"}</td>
                    <td className="pr-3">{s190?.allocation ?? "—"} / {s491?.allocation ?? "—"}</td>
                    <td className="pr-3">{money(s190?.feeExclGst ?? null)} / {money(s190?.feeInclGst ?? null)}</td>
                    <td className="pr-3">
                      {p.lastVerifiedAt.slice(0, 10)}
                      <span className={`ml-1 text-xs ${age > 14 ? "font-semibold text-amber-700" : "text-slate-500"}`}>({age} d ago{p.lastVerifiedBy ? `, ${p.lastVerifiedBy}` : ""})</span>
                    </td>
                    <td>{hasPendingTranslation(p) ? <span className="text-xs font-semibold text-amber-700">draft to review</span> : <span className="text-xs text-slate-500">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <MonitorPanel />
    </main>
  );
}
