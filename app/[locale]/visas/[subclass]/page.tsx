import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ShieldCheck } from "lucide-react";

import { db } from "@/db";
import { sourceSnapshots, visaStructuredData, visaTypes } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── local types for JSONB fields ─────────────────────────────────────────────

type TestScores = {
  standard: number | string;
  elicos_10_weeks: number | string;
  elicos_20_weeks: number | string;
};

type EnglishRequirements = {
  test_taken_on_or_before_2025_08_06?: Record<string, TestScores>;
  test_taken_on_or_after_2025_08_07?: Record<string, TestScores>;
  notes?: string[];
};

type FinancialRequirements = {
  living_costs_12_months?: Record<string, string>;
  annual_income_option?: Record<string, string>;
  schooling_costs_per_child?: string;
  travel_costs_guidance?: Record<string, string>;
};

// ─── data fetching ────────────────────────────────────────────────────────────

async function getVisaDetails(subclass: string) {
  const [visaRow] = await db
    .select()
    .from(visaTypes)
    .where(eq(visaTypes.subclass, subclass))
    .limit(1);

  if (!visaRow) return null;

  const [structured] = await db
    .select()
    .from(visaStructuredData)
    .where(eq(visaStructuredData.visa_type_id, visaRow.id))
    .limit(1);

  const snapshots = await db
    .select({
      id: sourceSnapshots.id,
      pdf_snapshot_url: sourceSnapshots.pdf_snapshot_url,
      source_url: sourceSnapshots.source_url,
      captured_at: sourceSnapshots.captured_at,
      notes: sourceSnapshots.notes,
    })
    .from(sourceSnapshots)
    .where(eq(sourceSnapshots.visa_type_id, visaRow.id));

  return { visa: visaRow, structured: structured ?? null, snapshots };
}

// ─── render helpers ───────────────────────────────────────────────────────────

function MetaItem({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function StringList({ items }: { items: unknown }) {
  const arr = Array.isArray(items) ? (items as string[]) : [];
  if (arr.length === 0) return <p className="text-sm text-muted-foreground">No data available.</p>;
  return (
    <ul className="space-y-2">
      {arr.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
          <span className="mt-0.5 text-primary">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function NumberedList({ items }: { items: unknown }) {
  const arr = Array.isArray(items) ? (items as string[]) : [];
  if (arr.length === 0) return <p className="text-sm text-muted-foreground">No data available.</p>;
  return (
    <ol className="space-y-2">
      {arr.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {i + 1}
          </span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function RiskList({ items }: { items: unknown }) {
  const arr = Array.isArray(items) ? (items as string[]) : [];
  if (arr.length === 0) return <p className="text-sm text-muted-foreground">No data available.</p>;
  return (
    <ul className="space-y-2">
      {arr.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
          <span className="mt-0.5 text-orange-500">!</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function EnglishRequirementsSection({ data }: { data: unknown }) {
  if (!data || typeof data !== "object") {
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  }

  const eng = data as EnglishRequirements;

  const renderScoreTable = (tests: Record<string, TestScores>) => {
    const entries = Object.entries(tests);
    if (entries.length === 0) return null;
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 pr-4">Test</th>
              <th className="pb-2 pr-4">Standard</th>
              <th className="pb-2 pr-4">ELICOS 10 wks</th>
              <th className="pb-2">ELICOS 20 wks</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map(([test, scores]) => (
              <tr key={test}>
                <td className="py-2 pr-4 font-medium">{test}</td>
                <td className="py-2 pr-4 text-muted-foreground">{scores.standard}</td>
                <td className="py-2 pr-4 text-muted-foreground">{scores.elicos_10_weeks}</td>
                <td className="py-2 text-muted-foreground">{scores.elicos_20_weeks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {eng.test_taken_on_or_before_2025_08_06 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">Tests taken on or before 6 August 2025</p>
          {renderScoreTable(eng.test_taken_on_or_before_2025_08_06)}
        </div>
      )}

      {eng.test_taken_on_or_after_2025_08_07 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">Tests taken on or after 7 August 2025</p>
          {renderScoreTable(eng.test_taken_on_or_after_2025_08_07)}
        </div>
      )}

      {eng.notes && eng.notes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Notes</p>
          <ul className="space-y-1">
            {eng.notes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-primary">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FinancialRequirementsSection({ data }: { data: unknown }) {
  if (!data || typeof data !== "object") {
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  }

  const fin = data as FinancialRequirements;

  const KVTable = ({ rows }: { rows: Record<string, string> }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <tbody className="divide-y">
          {Object.entries(rows).map(([key, value]) => (
            <tr key={key}>
              <td className="py-2 pr-4 capitalize text-muted-foreground">
                {key.replace(/_/g, " ")}
              </td>
              <td className="py-2 font-medium">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {fin.living_costs_12_months && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Living costs (per 12 months)</p>
          <KVTable rows={fin.living_costs_12_months} />
        </div>
      )}

      {fin.annual_income_option && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Annual income option</p>
          <KVTable rows={fin.annual_income_option} />
        </div>
      )}

      {fin.schooling_costs_per_child && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Schooling costs (per child, per year)</p>
          <p className="text-sm text-muted-foreground">{fin.schooling_costs_per_child}</p>
        </div>
      )}

      {fin.travel_costs_guidance && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Travel costs guidance</p>
          <KVTable rows={fin.travel_costs_guidance} />
        </div>
      )}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

type PageProps = {
  params: Promise<{ locale: string; subclass: string }>;
};

export default async function VisaDetailsPage({ params }: PageProps) {
  const { locale, subclass } = await params;

  const result = await getVisaDetails(subclass);
  if (!result) notFound();

  const { visa, structured, snapshots } = result;

  const pdfSnapshots = snapshots.filter((s) => s.pdf_snapshot_url);

  const reviewedBadgeVariant =
    visa.reviewed_status === "approved"
      ? "default"
      : visa.reviewed_status === "needs_review"
        ? "secondary"
        : "outline";

  const sections = [
    {
      title: "Key requirements",
      content: <StringList items={structured?.key_requirements} />,
    },
    {
      title: "Documents required",
      content: <StringList items={structured?.documents_required} />,
    },
    {
      title: "Application steps",
      content: <NumberedList items={structured?.application_steps} />,
    },
    {
      title: "Visa conditions",
      content: <StringList items={structured?.visa_conditions} />,
    },
    {
      title: "Risk flags",
      content: <RiskList items={structured?.risks} />,
    },
    {
      title: "English language requirements",
      content: <EnglishRequirementsSection data={structured?.english_requirements} />,
    },
    {
      title: "Financial requirements",
      content: <FinancialRequirementsSection data={structured?.financial_requirements} />,
    },
  ];

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-8">

        {/* breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/${locale}`} className="hover:text-foreground">
            Home
          </Link>
          <span>/</span>
          <Link href={`/${locale}/checker`} className="hover:text-foreground">
            Visa Checker
          </Link>
          <span>/</span>
          <span className="text-foreground">Subclass {visa.subclass}</span>
        </nav>

        {/* header */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">Subclass {visa.subclass}</Badge>
            <Badge variant="secondary">{visa.category}</Badge>
            <Badge variant={reviewedBadgeVariant}>{visa.reviewed_status ?? "needs_review"}</Badge>
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">{visa.visa_name}</h1>
          {visa.purpose && (
            <p className="max-w-3xl text-base text-muted-foreground">{visa.purpose}</p>
          )}
        </div>

        {/* meta grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <MetaItem label="Stay period" value={visa.stay_period} />
              <MetaItem label="Cost" value={visa.cost} />
              <MetaItem label="Work rights" value={visa.work_rights} />
              <MetaItem
                label="Last checked"
                value={
                  visa.last_checked
                    ? new Date(visa.last_checked).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : undefined
                }
              />
              {visa.source_url && (
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Official source
                  </p>
                  <a
                    href={visa.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {visa.source_url}
                  </a>
                </div>
              )}
            </div>

            {pdfSnapshots.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {pdfSnapshots.map((snap) => (
                  <Button key={snap.id} asChild variant="outline" size="sm">
                    <a
                      href={snap.pdf_snapshot_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View PDF snapshot
                      {snap.captured_at &&
                        ` (${new Date(snap.captured_at).toLocaleDateString("en-AU")})`}
                    </a>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* structured sections */}
        <div className="space-y-4">
          {sections.map(({ title, content }) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent>{content}</CardContent>
            </Card>
          ))}
        </div>

        {/* compliance notice */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="flex gap-4 p-5">
            <ShieldCheck className="mt-1 size-5 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              This page provides general information only. It does not provide migration advice or
              legal advice. For personalised advice, speak with a registered migration agent or
              Australian legal practitioner.
            </p>
          </CardContent>
        </Card>

        {/* navigation */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href={`/${locale}`}>Home</Link>
          </Button>
          <Button asChild>
            <Link href={`/${locale}/checker`}>Check your pathway</Link>
          </Button>
        </div>

      </section>
    </main>
  );
}
