import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/rbac";
import { getAgentLeads, getAgentMetrics, getAgentUser, splitName } from "@/lib/crm/leads";
import { getAgentTransactionsForAdmin } from "@/lib/crm/transactions";
import { tierBadgeClass, tierEmoji } from "@/lib/crm/tiers";
import { approveAgentAction, rejectAgentAction } from "../../actions";

export const metadata: Metadata = {
  title: "Admin · Agent detail · LogiVisa Portal",
  robots: { index: false, follow: false },
};

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

type PageProps = { params: Promise<{ locale: string; id: string }> };

function StatCard({ label, value, tier }: { label: string; value: number; tier?: "Hot" | "Warm" | "Cold" }) {
  return (
    <div
      className={`rounded-xl border px-4 py-5 ${
        tier ? tierBadgeClass(tier) : "border-slate-200 bg-white text-slate-900"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {tier ? `${tierEmoji(tier)} ${label}` : label}
      </p>
      <p className="mt-1 text-3xl font-extrabold">{value}</p>
    </div>
  );
}

export default async function AdminAgentDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  await requireRole("ADMIN", locale, `/${locale}/admin/crm/agent/${id}`);

  const agent = await getAgentUser(id);
  if (!agent) notFound();

  const [metrics, assignedLeads, transactions] = await Promise.all([
    getAgentMetrics(id),
    getAgentLeads(id),
    getAgentTransactionsForAdmin(id),
  ]);
  const totalCommission = transactions.reduce((sum, tx) => sum + (tx.commissionAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/${locale}/admin/crm/dashboard`}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            ← Back to agents
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{agent.name ?? agent.email}</h1>
          <p className="text-sm text-slate-500">Agent profile &amp; historical performance.</p>
        </div>
        {agent.approvalStatus === "PENDING" ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
              ⏳ Pending approval
            </span>
            <form action={rejectAgentAction.bind(null, agent.id)}>
              <Button type="submit" size="sm" variant="outline">
                Reject
              </Button>
            </form>
            <form action={approveAgentAction.bind(null, agent.id)}>
              <Button type="submit" size="sm">
                Approve agent
              </Button>
            </form>
          </div>
        ) : agent.approvalStatus === "REJECTED" ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700">
              ✕ Rejected
            </span>
            <form action={approveAgentAction.bind(null, agent.id)}>
              <Button type="submit" size="sm">
                Approve anyway
              </Button>
            </form>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
            ✅ Approved
          </span>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-0.5 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</span>
              <span className="text-sm font-medium">{agent.name ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</span>
              <span className="text-sm font-medium">{agent.email}</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Agent ID</span>
              <span className="text-sm font-medium break-all">{agent.id}</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Joined</span>
              <span className="text-sm font-medium">{agent.createdAt.toLocaleDateString(locale)}</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</span>
              <span className="text-sm font-medium">{agent.phone ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Company</span>
              <span className="text-sm font-medium">{agent.companyName ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Address</span>
              <span className="text-sm font-medium">{agent.address ?? "—"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total leads" value={metrics.total} />
            <StatCard label="Hot" value={metrics.hot} tier="Hot" />
            <StatCard label="Warm" value={metrics.warm} tier="Warm" />
            <StatCard label="Cold" value={metrics.cold} tier="Cold" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned leads ({assignedLeads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {assignedLeads.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No leads assigned yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Name</th>
                    <th className="px-4 py-2 font-semibold">Email</th>
                    <th className="px-4 py-2 font-semibold">Tier</th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                    <th className="px-4 py-2 font-semibold">Received</th>
                    <th className="px-4 py-2 font-semibold sr-only">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedLeads.map((lead) => {
                    const { firstName, lastName } = splitName(lead.fullName);
                    return (
                      <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 pr-4 font-medium">
                          {firstName || lastName ? `${firstName} ${lastName}`.trim() : "—"}
                        </td>
                        <td className="px-4 py-2 text-slate-600">{lead.email}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${tierBadgeClass(
                              lead.pointsTier
                            )}`}
                          >
                            {tierEmoji(lead.pointsTier)} {lead.pointsTier ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-600">{lead.docStatus ?? "New"}</td>
                        <td className="px-4 py-2 text-slate-500">{lead.createdAt.toLocaleDateString(locale)}</td>
                        <td className="px-4 py-2 text-right">
                          <Link
                            href={`/${locale}/admin/crm/lead/${lead.id}`}
                            className="font-medium text-indigo-600 hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Transactions &amp; commission ({transactions.length}) — total {formatUsd(totalCommission)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Lead</th>
                    <th className="px-4 py-2 font-semibold">Total price</th>
                    <th className="px-4 py-2 font-semibold">Rate</th>
                    <th className="px-4 py-2 font-semibold">Agent share</th>
                    <th className="px-4 py-2 font-semibold">Date</th>
                    <th className="px-4 py-2 font-semibold sr-only">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 pr-4 font-medium">{tx.leadName}</td>
                      <td className="px-4 py-2 text-slate-600">{formatUsd(tx.totalAmount)}</td>
                      <td className="px-4 py-2 text-slate-600">
                        {tx.commissionRate !== null ? `${(tx.commissionRate * 100).toFixed(0)}%` : "—"}
                      </td>
                      <td className="px-4 py-2 font-semibold text-emerald-700">
                        {tx.commissionAmount !== null ? formatUsd(tx.commissionAmount) : "—"}
                      </td>
                      <td className="px-4 py-2 text-slate-500">{tx.createdAt.toLocaleDateString(locale)}</td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          href={`/${locale}/admin/crm/lead/${tx.leadId}`}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          View lead
                        </Link>
                      </td>
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
