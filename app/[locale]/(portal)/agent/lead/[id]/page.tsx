import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/rbac";
import { getAgentLead, splitName } from "@/lib/crm/leads";
import { tierBadgeClass, tierEmoji } from "@/lib/crm/tiers";
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
    <div className="flex flex-col gap-0.5 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value || "—"}</span>
    </div>
  );
}

export default async function AgentLeadDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const prefix = locale === "en" ? "" : `/${locale}`;

  const user = await requireRole("AGENT", locale, `${prefix}/agent/lead/${id}`);
  const lead = await getAgentLead(user.id, id);
  if (!lead) notFound();

  const { firstName, lastName } = splitName(lead.fullName);
  const pdfUrl = `/api/agent/lead/${id}/pdf`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`${prefix}/agent/dashboard`}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            ← Back to my leads
          </Link>
          <h1 className="mt-1 text-2xl font-bold">
            {firstName || lastName ? `${firstName} ${lastName}`.trim() : lead.email}
          </h1>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-semibold ${tierBadgeClass(
            lead.pointsTier
          )}`}
        >
          {tierEmoji(lead.pointsTier)} {lead.pointsTier ?? "Unassigned"} tier
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow label="First name" value={firstName} />
            <DetailRow label="Last name" value={lastName} />
            <DetailRow label="Email" value={lead.email} />
            <DetailRow label="Phone number" value={lead.phone ?? ""} />
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
          <WorkflowForm
            locale={locale}
            leadId={id}
            initialDocStatus={lead.docStatus ?? "New"}
            initialNotes={lead.agentNotes ?? ""}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Assessment report</CardTitle>
          <Button asChild size="sm">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              Download PDF
            </a>
          </Button>
        </CardHeader>
        <CardContent>
          {lead.reportJson ? (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <iframe
                src={pdfUrl}
                title="Assessment report"
                className="h-[720px] w-full"
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No generated report is stored for this lead yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
