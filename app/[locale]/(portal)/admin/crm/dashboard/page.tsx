import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/rbac";
import { getAgents, getAllAgentMetrics, getUnassignedLeads } from "@/lib/crm/leads";
import { LeadAssigner } from "./lead-assigner";
import { tierBadgeClass, tierEmoji } from "@/lib/crm/tiers";

export const metadata: Metadata = {
  title: "Admin · Agents · LogiVisa Portal",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ locale: string }> };

function TierPill({ tier, count }: { tier: "Hot" | "Warm" | "Cold"; count: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${tierBadgeClass(
        tier
      )}`}
    >
      {tierEmoji(tier)} {tier}: {count}
    </span>
  );
}

export default async function AdminDashboardPage({ params }: PageProps) {
  const { locale } = await params;
  await requireRole("ADMIN", locale, `/${locale}/admin/crm/dashboard`);

  const [agents, metricsByAgent, unassignedLeads] = await Promise.all([
    getAgents(), 
    getAllAgentMetrics(),
    getUnassignedLeads()
  ]);

  const totals = agents.reduce(
    (acc, agent) => {
      const m = metricsByAgent.get(agent.id);
      if (m) {
        acc.total += m.total;
        acc.hot += m.hot;
        acc.warm += m.warm;
        acc.cold += m.cold;
      }
      return acc;
    },
    { total: 0, hot: 0, warm: 0, cold: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Admin</p>
          <h1 className="text-2xl font-bold">Agents &amp; performance</h1>
          <p className="text-sm text-slate-500">
            {agents.length} agent{agents.length === 1 ? "" : "s"} · {totals.total} total leads assigned.
          </p>
        </div>
        <div className="flex gap-2">
          {agents.some((agent) => agent.approvalStatus === "PENDING") && (
            <Button asChild variant="outline">
              <Link href={`/${locale}/admin/crm/agents/pending`}>Pending applications</Link>
            </Button>
          )}
          <Button asChild>
            <Link href={`/${locale}/admin/crm/agents/create`}>Add New Agent</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registered agents</CardTitle>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No agents yet. Set a user&apos;s role to <code>AGENT</code> to list them here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-3 pr-4 font-semibold">Agent</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Total</th>
                    <th className="px-4 py-3 font-semibold">Breakdown by tier</th>
                    <th className="px-4 py-3 font-semibold sr-only">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => {
                    const m = metricsByAgent.get(agent.id) ?? { total: 0, hot: 0, warm: 0, cold: 0 };
                    return (
                      <tr key={agent.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 pr-4 font-medium">{agent.name ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{agent.email}</td>
                        <td className="px-4 py-3">
                          {agent.approvalStatus === "PENDING" ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                              ⏳ Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              ✅ Approved
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold">{m.total}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <TierPill tier="Hot" count={m.hot} />
                            <TierPill tier="Warm" count={m.warm} />
                            <TierPill tier="Cold" count={m.cold} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/${locale}/admin/crm/agent/${agent.id}`}
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
          <CardTitle className="text-base">Unassigned leads</CardTitle>
        </CardHeader>
        <CardContent>
          <LeadAssigner unassignedLeads={unassignedLeads} agents={agents} />
        </CardContent>
      </Card>
    </div>
  );
}
