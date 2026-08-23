import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { requireRole } from "@/lib/auth/rbac";
import { getLeadById, parseNotes, splitName } from "@/lib/crm/leads";
import { getLeadNotes } from "@/lib/crm/notes";
import { tierBadgeClass, tierEmoji } from "@/lib/crm/tiers";
import { LeadNotes } from "@/components/crm/lead-notes";

export const metadata: Metadata = {
  title: "Admin · Lead detail · LogiVisa Portal",
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

function formatNoteTimestamp(iso: string, locale: string): string {
  if (!iso) return "Earlier";
  try {
    return new Date(iso).toLocaleString(locale);
  } catch {
    return iso;
  }
}

// Admin has full, unscoped visibility into any lead's assessment details --
// no "aggregate metrics only" restriction. Doc-status editing stays the
// owning agent's job (see /agent/lead/[id]), but notes are shared: admin can
// read and add notes here too (see addLeadNoteAction's ADMIN branch).
export default async function AdminLeadDetailPage({ params }: PageProps) {
  const { locale, id } = await params;

  await requireRole("ADMIN", locale, `/${locale}/admin/crm/lead/${id}`);
  const lead = await getLeadById(id);
  if (!lead) notFound();

  const { firstName, lastName } = splitName(lead.fullName);
  const legacyNotes = parseNotes(lead.agentNotes);
  const notes = await getLeadNotes(id);
  const pdfUrl = `/api/agent/lead/${id}/pdf`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={lead.agentId ? `/${locale}/admin/crm/agent/${lead.agentId}` : `/${locale}/admin/crm/dashboard`}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            ← Back
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
          <DetailRow label="Document / skills-assessment status (agent-only)" value={lead.docStatus ?? "New"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes &amp; Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LeadNotes leadId={id} locale={locale} initialNotes={notes} />
          {legacyNotes.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Earlier notes
              </Label>
              <ul className="space-y-2">
                {legacyNotes.map((entry, i) => (
                  <li key={i} className="rounded-lg border border-slate-100 bg-slate-50/40 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {formatNoteTimestamp(entry.at, locale)}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{entry.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
              <iframe src={pdfUrl} title="Assessment report" className="h-[720px] w-full" />
            </div>
          ) : (
            <p className="text-sm text-slate-500">No generated report is stored for this lead yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
