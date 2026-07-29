import Link from "next/link";
import type { Metadata } from "next";
import { Eye } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isApprovedAgent, requireRole } from "@/lib/auth/rbac";
import { getAgentLeads, splitName, type LeadSort } from "@/lib/crm/leads";
import { getAgentCommissionTotal, getAgentTransactions } from "@/lib/crm/transactions";
import { LEAD_TIERS, tierBadgeClass, tierEmoji } from "@/lib/crm/tiers";
import { PendingApprovalNotice } from "../pending-approval-notice";

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export const metadata: Metadata = {
  title: "My leads · LogiVisa Portal",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tier?: string; sort?: string }>;
};

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
        active
          ? "border-indigo-600 bg-indigo-600 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function AgentDashboardPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { tier, sort } = await searchParams;
  const prefix = locale === "en" ? "" : `/${locale}`;
  const dashboardPath = `${prefix}/agent/dashboard`;

  const user = await requireRole("AGENT", locale, dashboardPath);

  if (!isApprovedAgent(user)) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Agent</p>
          <h1 className="text-2xl font-bold">My assigned leads</h1>
        </div>
        <PendingApprovalNotice />
      </div>
    );
  }

  const activeTier = tier === "Hot" || tier === "Warm" || tier === "Cold" ? tier : undefined;
  const activeSort: LeadSort = sort === "oldest" ? "oldest" : "newest";

  const [leads, transactions, commissionTotal] = await Promise.all([
    getAgentLeads(user.id, { tier: activeTier, sort: activeSort }),
    getAgentTransactions(user.id),
    getAgentCommissionTotal(user.id),
  ]);

  const buildQuery = (next: { tier?: string; sort?: string }) => {
    const sp = new URLSearchParams();
    const t = next.tier ?? activeTier;
    const s = next.sort ?? activeSort;
    if (t) sp.set("tier", t);
    if (s && s !== "newest") sp.set("sort", s);
    const qs = sp.toString();
    return qs ? `${dashboardPath}?${qs}` : dashboardPath;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Agent</p>
          <h1 className="text-2xl font-bold">My assigned leads</h1>
          <p className="text-sm text-slate-500">
            Signed in as {user.name ?? user.email}. Showing only leads routed to you.
          </p>
        </div>
        <Link href={`${prefix}/agent/pool`} className="text-sm font-medium text-indigo-600 hover:underline">
          Lead pool →
        </Link>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Total confirmed commission
        </p>
        <p className="mt-1 text-3xl font-extrabold text-emerald-900">{formatUsd(commissionTotal)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My sales &amp; commission</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No confirmed sales yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Customer</th>
                    <th className="px-4 py-2 font-semibold">Total paid</th>
                    <th className="px-4 py-2 font-semibold">Your commission</th>
                    <th className="px-4 py-2 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-100">
                      <td className="py-2 pr-4 font-medium">{tx.leadName}</td>
                      <td className="px-4 py-2 text-slate-600">{formatUsd(tx.totalAmount)}</td>
                      <td className="px-4 py-2 font-semibold text-emerald-700">
                        {formatUsd(tx.commissionAmount)}
                      </td>
                      <td className="px-4 py-2 text-slate-500">{tx.createdAt.toLocaleDateString(locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4">
          <CardTitle className="text-base">Filter &amp; sort</CardTitle>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tier</span>
              <FilterLink href={buildQuery({ tier: "" })} active={!activeTier}>
                All
              </FilterLink>
              {LEAD_TIERS.map((t) => (
                <FilterLink key={t} href={buildQuery({ tier: t })} active={activeTier === t}>
                  {tierEmoji(t)} {t}
                </FilterLink>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Date</span>
              <FilterLink href={buildQuery({ sort: "newest" })} active={activeSort === "newest"}>
                Newest
              </FilterLink>
              <FilterLink href={buildQuery({ sort: "oldest" })} active={activeSort === "oldest"}>
                Oldest
              </FilterLink>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No leads {activeTier ? `in the ${activeTier} tier ` : ""}assigned to you yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-3 pr-4 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Tier</th>
                    <th className="px-4 py-3 font-semibold">Doc status</th>
                    <th className="px-4 py-3 font-semibold">Received</th>
                    <th className="px-4 py-3 font-semibold sr-only">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => {
                    const { firstName, lastName } = splitName(lead.fullName);
                    return (
                      <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 pr-4 font-medium">
                          {firstName || lastName ? `${firstName} ${lastName}`.trim() : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{lead.email}</td>
                        <td className="px-4 py-3 text-slate-600">{lead.phone ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${tierBadgeClass(
                              lead.pointsTier
                            )}`}
                          >
                            {tierEmoji(lead.pointsTier)} {lead.pointsTier ?? "Unassigned"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{lead.docStatus ?? "New"}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {lead.createdAt.toLocaleDateString(locale)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`${prefix}/agent/lead/${lead.id}`}
                            className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
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
    </div>
  );
}
