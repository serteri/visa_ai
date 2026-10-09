import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { clientReference, requireApprovedAgentPage } from "@/lib/crm/agent-access";
import { getAgentLead, parseNotes } from "@/lib/crm/leads";
import { getLeadNotes } from "@/lib/crm/notes";
import { LeadNotes } from "@/components/crm/lead-notes";
import { WorkflowForm } from "./workflow-form";

export const metadata: Metadata = {
  title: "Lead detail · LogiVisa Portal",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value || "—"}</span>
    </div>
  );
}

export default async function AgentLeadDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const prefix = locale === "en" ? "" : `/${locale}`;

  // Signed in, an AGENT, approved in the database right now; nothing is read for anyone else.
  const user = await requireApprovedAgentPage(locale, `${prefix}/agent/lead/${id}`);
  const lead = await getAgentLead(user.id, id);
  if (!lead) notFound();

  const notes = await getLeadNotes(id);
  const legacyNotes = parseNotes(lead.agentNotes);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`${prefix}/agent/dashboard`} className="text-sm font-medium text-indigo-600 hover:underline">
            ← Back to my referrals
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{clientReference(lead.id)}</h1>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700">
          {lead.isPaid ? "Purchased" : "Not purchased"}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700" data-testid="agent-details-notice">
            This client&apos;s name, contact details, entered details and report are not shown to agents until the client has agreed to share them.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <DetailRow label="Source" value={lead.source} />
            <DetailRow label="Received" value={lead.createdAt.toLocaleString(locale)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkflowForm locale={locale} leadId={id} initialDocStatus={lead.docStatus ?? "New"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes &amp; Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LeadNotes leadId={id} locale={locale} initialNotes={notes} />
          {legacyNotes.length > 0 && (
            <div className="space-y-2 border-t border-slate-200 pt-4">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Earlier notes</Label>
              <ul className="space-y-2">
                {legacyNotes.map((entry, i) => (
                  <li key={i} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {entry.at ? new Date(entry.at).toLocaleString(locale) : "Earlier"}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">{entry.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
