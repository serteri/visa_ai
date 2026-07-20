import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isApprovedAgent, requireRole } from "@/lib/auth/rbac";
import { getLeadPool } from "@/lib/crm/leads";
import { claimLeadAction } from "./actions";
import { PendingApprovalNotice } from "../pending-approval-notice";
import { ReferralLinkCard } from "../referral-link-card";

export const metadata: Metadata = {
  title: "Lead pool · LogiVisa Portal",
  robots: { index: false, follow: false },
};

const SOURCE_LABEL: Record<string, string> = {
  pdf_turkish_guide: "Turkish Guide",
  pdf_global_guide: "Global Guide",
  pdf_occupation_list: "2026 Official Occupation List",
};

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AgentLeadPoolPage({ params }: PageProps) {
  const { locale } = await params;
  const prefix = locale === "en" ? "" : `/${locale}`;

  const user = await requireRole("AGENT", locale, `${prefix}/agent/pool`);

  if (!isApprovedAgent(user)) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Agent</p>
          <h1 className="text-2xl font-bold">Lead pool</h1>
        </div>
        <PendingApprovalNotice />
      </div>
    );
  }

  const pool = await getLeadPool(user.market);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Agent</p>
          <h1 className="text-2xl font-bold">Lead pool</h1>
          <p className="text-sm text-slate-500">
            {user.market === "TR"
              ? "Turkish Guide, Global Guide, and Occupation List leads awaiting an agent."
              : "Global Guide and Occupation List leads awaiting an agent. Turkish Guide leads are reserved for Turkey-market agents."}
          </p>
        </div>
        <Link href={`${prefix}/agent/dashboard`} className="text-sm font-medium text-indigo-600 hover:underline">
          My assigned leads →
        </Link>
      </div>

      <ReferralLinkCard agentId={user.id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unclaimed leads ({pool.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pool.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No unclaimed leads right now.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-3 pr-4 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Received</th>
                    <th className="px-4 py-3 font-semibold sr-only">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pool.map((lead) => (
                    <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 pr-4 font-medium">{lead.fullName || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{lead.email}</td>
                      <td className="px-4 py-3 text-slate-600">{lead.phone ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                          {SOURCE_LABEL[lead.source] ?? lead.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{lead.createdAt.toLocaleDateString(locale)}</td>
                      <td className="px-4 py-3 text-right">
                        <form action={claimLeadAction.bind(null, locale, lead.id)}>
                          <Button type="submit" size="sm">
                            Claim
                          </Button>
                        </form>
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
