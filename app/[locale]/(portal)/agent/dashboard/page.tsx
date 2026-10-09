import Link from "next/link";
import type { Metadata } from "next";
import { Eye } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/rbac";
import { clientReference, getApprovedAgent } from "@/lib/crm/agent-access";
import { getAgentReferrals, type LeadSort } from "@/lib/crm/leads";
import { formatAud } from "@/lib/crm/format-money";
import { getAgentCommissionTotal, getAgentTransactions } from "@/lib/crm/transactions";
import { AgentNav } from "../agent-nav";
import { PendingApprovalNotice } from "../pending-approval-notice";

export const metadata: Metadata = {
  title: "My referrals · LogiVisa Portal",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sort?: string }>;
};

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
        active ? "border-[#53917E] bg-[#53917E] text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-[#53917E]/10"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function AgentDashboardPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { sort } = await searchParams;
  const prefix = locale === "en" ? "" : `/${locale}`;
  const dashboardPath = `${prefix}/agent/dashboard`;

  const user = await requireRole("AGENT", locale, dashboardPath);

  // Approval is read from the database, not the session: nothing below is queried for a pending or rejected agent.
  if (!(await getApprovedAgent(user.id))) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#53917E]">Agent</p>
          <h1 className="text-2xl font-bold">My referrals</h1>
        </div>
        <PendingApprovalNotice />
      </div>
    );
  }

  const activeSort: LeadSort = sort === "oldest" ? "oldest" : "newest";

  const [referrals, transactions, commissionTotal] = await Promise.all([
    getAgentReferrals(user.id, { sort: activeSort }),
    getAgentTransactions(user.id),
    getAgentCommissionTotal(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#53917E]">Agent</p>
          <h1 className="text-2xl font-bold">My referrals</h1>
          <p className="text-sm text-slate-600">
            Signed in as {user.name ?? user.email}. Showing only clients referred through your link.
          </p>
        </div>
        <AgentNav locale={locale} active="dashboard" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700" data-testid="agent-details-notice">
        A client&apos;s name, contact details, entered details and report are not shown to agents until the client has agreed to share them. Each
        referred client appears here by reference, with the purchase status.
      </div>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Commission recorded (AUD, excluding GST)</p>
        <p className="mt-1 text-3xl font-extrabold text-emerald-700">{formatAud(commissionTotal)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My sales &amp; commission</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-600">No sales yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="py-2 pr-4 font-semibold">Client</th>
                    <th className="px-4 py-2 font-semibold">Total paid (incl. GST)</th>
                    <th className="px-4 py-2 font-semibold">Your commission</th>
                    <th className="px-4 py-2 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-200">
                      <td className="py-2 pr-4 font-medium text-slate-900">{tx.leadName}</td>
                      <td className="px-4 py-2 text-slate-600">{formatAud(tx.totalAmount)}</td>
                      <td className="px-4 py-2 font-semibold text-emerald-700">{formatAud(tx.commissionAmount)}</td>
                      <td className="px-4 py-2 text-slate-600">{tx.createdAt.toLocaleDateString(locale)}</td>
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
          <CardTitle className="text-base">Referred clients</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Date</span>
            <FilterLink href={dashboardPath} active={activeSort === "newest"}>
              Newest
            </FilterLink>
            <FilterLink href={`${dashboardPath}?sort=oldest`} active={activeSort === "oldest"}>
              Oldest
            </FilterLink>
          </div>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-600">No clients have been referred through your link yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="py-3 pr-4 font-semibold">Client</th>
                    <th className="px-4 py-3 font-semibold">Purchase</th>
                    <th className="px-4 py-3 font-semibold">Doc status</th>
                    <th className="px-4 py-3 font-semibold">Received</th>
                    <th className="px-4 py-3 font-semibold sr-only">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
                    <tr key={r.id} className="border-b border-slate-200 hover:bg-[#53917E]/10">
                      <td className="py-3 pr-4 font-medium text-slate-900">{clientReference(r.id)}</td>
                      <td className="px-4 py-3 text-slate-600">{r.isPaid ? "Purchased" : "Not purchased"}</td>
                      <td className="px-4 py-3 text-slate-600">{r.docStatus ?? "New"}</td>
                      <td className="px-4 py-3 text-slate-600">{r.createdAt.toLocaleDateString(locale)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`${prefix}/agent/lead/${r.id}`} className="inline-flex items-center gap-1 font-medium text-[#53917E] hover:underline">
                          <Eye className="h-3.5 w-3.5" /> View
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
