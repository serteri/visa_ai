import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isApprovedAgent, requireRole } from "@/lib/auth/rbac";
import { getAgentEarnings, getAgentTransactions } from "@/lib/crm/transactions";
import { AgentNav } from "../agent-nav";
import { PendingApprovalNotice } from "../pending-approval-notice";

export const metadata: Metadata = {
  title: "Earnings · LogiVisa Portal",
  robots: { index: false, follow: false },
};

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

type PageProps = { params: Promise<{ locale: string }> };

export default async function AgentEarningsPage({ params }: PageProps) {
  const { locale } = await params;
  const prefix = locale === "en" ? "" : `/${locale}`;

  const user = await requireRole("AGENT", locale, `${prefix}/agent/earnings`);

  if (!isApprovedAgent(user)) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Agent</p>
          <h1 className="text-2xl font-bold">Earnings</h1>
        </div>
        <PendingApprovalNotice />
      </div>
    );
  }

  const [summary, transactions] = await Promise.all([
    getAgentEarnings(user.id),
    getAgentTransactions(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Agent</p>
          <h1 className="text-2xl font-bold">Earnings</h1>
          <p className="text-sm text-slate-600">Your referral performance and commission history.</p>
        </div>
        <AgentNav locale={locale} active="earnings" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total referred" value={String(summary.totalReferred)} />
        <StatCard label="Paying customers" value={String(summary.totalPaid)} />
        <StatCard label="Total commission" value={formatUsd(summary.totalCommission)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commission history ({transactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-600">No commission earned yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="py-2 pr-4 font-semibold">Customer</th>
                    <th className="px-4 py-2 font-semibold">Total paid</th>
                    <th className="px-4 py-2 font-semibold">Your commission</th>
                    <th className="px-4 py-2 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-200 hover:bg-[#53917E]/10">
                      <td className="py-2 pr-4 font-medium text-slate-900">{tx.leadName}</td>
                      <td className="px-4 py-2 text-slate-600">{formatUsd(tx.totalAmount)}</td>
                      <td className="px-4 py-2 font-semibold text-emerald-700">
                        {formatUsd(tx.commissionAmount)}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{tx.createdAt.toLocaleDateString(locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
