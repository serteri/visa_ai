import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminNav } from "@/app/[locale]/(main)/admin/admin-nav";
import { AnzscoMatcher } from "@/components/AnzscoMatcher";
import { AnzscoMatcherErrorBoundary } from "@/components/AnzscoMatcherErrorBoundary";
import { DocumentAnalyzer } from "@/components/DocumentAnalyzer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import type { ReadinessInput, ReadinessReport } from "@/lib/readiness/types";

type LeadDetailPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

// Same source as admin/leads/page.tsx -- Prisma's UserReport (user_reports),
// not the phantom Drizzle `leads` table. The list page's row links already
// point here using UserReport ids.
async function getLead(id: string) {
  return prisma.userReport.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      source: true,
      preferredPath: true,
      leadScore: true,
      leadTier: true,
      locale: true,
      createdAt: true,
      inputJson: true,
      reportJson: true,
    },
  });
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { locale, id } = await params;

  if (!(await isAdminAuthenticated())) {
    redirect(`/${locale}/admin/leads/access?auth=invalid`);
  }

  const lead = await getLead(id);
  if (!lead) notFound();

  const input = (lead.inputJson ?? {}) as ReadinessInput;
  const report = lead.reportJson as ReadinessReport | null;

  const leadData = {
    fullName: lead.fullName ?? undefined,
    email: lead.email,
    occupation: input.occupation ?? undefined,
    englishLevel: input.englishLevel ?? undefined,
    age: input.age ?? undefined,
    currentCountry: input.currentCountry ?? undefined,
    targetVisa: lead.preferredPath ?? undefined,
  };

  return (
    <main className="ambient-bg flex-1 py-10">
      <section className="section-shell space-y-6 pt-8">
        <AdminNav locale={locale} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Lead Detail</p>
            <h1 className="text-3xl font-bold">{lead.fullName || lead.email}</h1>
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
              <p><span className="font-semibold">Occupation:</span> {input.occupation || "-"}</p>
              <p><span className="font-semibold">Selected visa:</span> {lead.preferredPath || lead.source || "-"}</p>
              <p><span className="font-semibold">Lead score:</span> {lead.leadScore ?? "-"}</p>
              <p><span className="font-semibold">Lead tier:</span> {lead.leadTier || "-"}</p>
              <p><span className="font-semibold">Age:</span> {input.age || "-"}</p>
              <p><span className="font-semibold">Budget:</span> {input.estimatedBudgetRange || "-"}</p>
              <p><span className="font-semibold">Current country:</span> {input.currentCountry || "-"}</p>
              <p><span className="font-semibold">Timeline:</span> {input.timeline || "-"}</p>
              <p><span className="font-semibold">English:</span> {input.englishLevel || "-"}</p>
              <p><span className="font-semibold">Created:</span> {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : "-"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lead Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-semibold">Main goal</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{input.mainGoal || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">Biggest concern</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{input.biggestConcern || "-"}</p>
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
              <AnzscoMatcher targetOccupation={input.occupation} />
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
                <p><span className="font-semibold">Locale:</span> {lead.locale}</p>
                <p><span className="font-semibold">Report ID:</span> {lead.id}</p>
                <p><span className="font-semibold">Email:</span> {lead.email}</p>
              </div>
              <div>
                <p className="font-semibold">Executive summary</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {report.executiveSummary.slice(0, 5).map((item) => (
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
