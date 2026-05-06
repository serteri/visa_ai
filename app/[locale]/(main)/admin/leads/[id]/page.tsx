import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminNav } from "@/app/[locale]/(main)/admin/admin-nav";
import { AnzscoMatcher } from "@/components/AnzscoMatcher";
import { AnzscoMatcherErrorBoundary } from "@/components/AnzscoMatcherErrorBoundary";
import { DocumentAnalyzer } from "@/components/DocumentAnalyzer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getUserReportById } from "@/src/lib/user-reports";

type LeadDetailPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { locale, id } = await params;

  if (!(await isAdminAuthenticated())) {
    redirect(`/${locale}/admin/leads/access?auth=invalid`);
  }

  const record = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  const lead = record[0];
  if (!lead) notFound();

  const leadData = {
    fullName: lead.full_name ?? undefined,
    email: lead.email,
    occupation: lead.occupation ?? undefined,
    englishLevel: lead.english_level ?? lead.english_test_taken ?? undefined,
    age: lead.age ?? undefined,
    currentCountry: lead.current_country ?? undefined,
    targetVisa: lead.selected_visa ?? undefined,
  };

  const report = lead.report_id ? await getUserReportById(lead.report_id) : null;

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <AdminNav locale={locale} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Lead Detail</p>
            <h1 className="text-3xl font-bold">{lead.full_name || lead.email}</h1>
            <p className="text-sm text-muted-foreground">{lead.email}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <a href={`mailto:${lead.email}?subject=Your LogiVisa Full Check`}>Email Gonder</a>
            </Button>
            <Button asChild>
              <Link href={`/${locale}/admin/leads`}>Geri Don</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader>
              <CardTitle>Lead Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <p><span className="font-semibold">Occupation:</span> {lead.occupation || "-"}</p>
              <p><span className="font-semibold">Selected visa:</span> {lead.selected_visa || "-"}</p>
              <p><span className="font-semibold">System score:</span> {lead.system_score ?? "-"}</p>
              <p><span className="font-semibold">Lead tier:</span> {lead.lead_tier || "-"}</p>
              <p><span className="font-semibold">Age:</span> {lead.age || "-"}</p>
              <p><span className="font-semibold">Budget:</span> {lead.estimated_budget_range || "-"}</p>
              <p><span className="font-semibold">Current country:</span> {lead.current_country || "-"}</p>
              <p><span className="font-semibold">Timeline:</span> {lead.timeline || "-"}</p>
              <p><span className="font-semibold">English:</span> {lead.english_level || "-"}</p>
              <p><span className="font-semibold">Created:</span> {lead.created_at ? new Date(lead.created_at).toLocaleString() : "-"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lead Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-semibold">Main goal</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{lead.main_goal || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">Biggest concern</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{lead.biggest_concern || "-"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>AI ANZSCO Duty Matcher</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enterprise CV and duty matching against ANZSCO expectations for the lead occupation.
            </p>
          </CardHeader>
          <CardContent>
            <AnzscoMatcherErrorBoundary>
              <AnzscoMatcher targetOccupation={lead.occupation} />
            </AnzscoMatcherErrorBoundary>
          </CardContent>
        </Card>

        {report && (
          <Card>
            <CardHeader>
              <CardTitle>Report Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-3">
                <p><span className="font-semibold">Locale:</span> {report.locale}</p>
                <p><span className="font-semibold">Report ID:</span> {report.id}</p>
                <p><span className="font-semibold">Email:</span> {report.email}</p>
              </div>
              <div>
                <p className="font-semibold">Executive summary</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {report.report.executiveSummary.slice(0, 5).map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Document Intelligence</CardTitle>
            <p className="text-sm text-muted-foreground">
              Analyze uploaded documents to extract additional readiness signals for this lead.
            </p>
          </CardHeader>
          <CardContent>
            <DocumentAnalyzer leadData={leadData} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}