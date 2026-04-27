import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FullCheckWaitlistForm } from "./full-check-waitlist-form";

const comparisonRows = [
  {
    label: "Possible pathways",
    quick: "Possible pathways only",
    full: "Included",
  },
  {
    label: "Risk indicators",
    quick: "Not included",
    full: "Included",
  },
  {
    label: "Document checklist",
    quick: "Not included",
    full: "Included",
  },
  {
    label: "Points estimate",
    quick: "No report",
    full: "Included",
  },
  {
    label: "Occupation review",
    quick: "No report",
    full: "Included",
  },
  {
    label: "Agent-ready summary",
    quick: "No report",
    full: "Included",
  },
  {
    label: "Downloadable report",
    quick: "No report",
    full: "Included",
  },
];

const previewCards = [
  {
    title: "Pathway comparison",
    description:
      "Compare supported visa pathways side by side so you can see which options may be relevant.",
  },
  {
    title: "Risk indicators",
    description:
      "Highlight factors that may need closer review before you prepare the next step.",
  },
  {
    title: "Document readiness",
    description:
      "See the kinds of documents and evidence that may be useful to prepare for each pathway.",
  },
  {
    title: "Suggested next steps",
    description:
      "Get a structured preparation sequence you can use before speaking with a registered migration agent.",
  },
  {
    title: "Agent-ready summary",
    description:
      "Create a concise summary of your situation to make a future agent conversation easier.",
  },
];

type FullCheckPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    source?: string;
    goal?: string;
    occupation?: string;
    preferredPathway?: string;
    visaInterest?: string;
    biggestConcern?: string;
    currentCountry?: string;
  }>;
};

function buildPrefilledGoal(input: {
  goal?: string;
  occupation?: string;
  biggestConcern?: string;
}) {
  const parts = [
    input.goal ? `Goal: ${input.goal}` : null,
    input.occupation ? `Occupation: ${input.occupation}` : null,
    input.biggestConcern ? `Biggest concern: ${input.biggestConcern}` : null,
  ].filter((item): item is string => Boolean(item));

  return parts.join("\n");
}

export default async function FullCheckPage({ params, searchParams }: FullCheckPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const cameFromReadinessPreview = query.source === "readiness-preview";
  const cameFromResults = query.source === "results";
  const initialValues = {
    visaInterest: query.visaInterest ?? query.preferredPathway ?? "",
    currentCountry: query.currentCountry ?? "",
    source: query.source ?? "full_check",
    mainGoal: buildPrefilledGoal({
      goal: query.goal,
      occupation: query.occupation,
      biggestConcern: query.biggestConcern,
    }),
  };

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr] lg:items-start">
          <div className="space-y-4">
            <Badge variant="secondary">Free limited report</Badge>
            <h1 className="text-3xl font-bold sm:text-4xl">
              Full Visa Readiness Report
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
              Submit your details to unlock a structured report with pathway comparison, risk indicators, document checklist, and suggested next steps. More detailed sections are coming soon.
            </p>
          </div>

          <Card className="border-primary/40 bg-primary/5">
            <CardHeader>
              <CardTitle>Get your free basic report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(cameFromReadinessPreview || cameFromResults) && (
                <p className="rounded-md border border-primary/20 bg-background/80 px-3 py-2 text-sm text-muted-foreground">
                  We added details from your {cameFromResults ? "quick check results" : "readiness preview"} where possible. You can edit anything before submitting.
                </p>
              )}
              <FullCheckWaitlistForm locale={locale} initialValues={initialValues} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Pathway Check vs Full Visa Readiness Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-3 pr-4 font-semibold">Feature</th>
                    <th className="px-4 py-3 font-semibold">Quick Pathway Check</th>
                    <th className="px-4 py-3 font-semibold text-primary">
                      Full Visa Readiness Report
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.label} className="border-b border-border/70 last:border-0">
                      <td className="py-3 pr-4 font-medium">{row.label}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.quick}</td>
                      <td className="px-4 py-3 font-medium">{row.full}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div>
            <h2 className="text-2xl font-bold">Report preview</h2>
            <p className="text-sm text-muted-foreground">
              Unlike the quick check, this report is organized as a practical review with separate sections.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {previewCards.map((card) => (
              <Card key={card.title}>
                <CardHeader>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Not ready yet?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You can still use the free pathway check or speak with a registered migration agent.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href={`/${locale}/checker`}>Back to checker</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/${locale}/agent-referral`}>
                  Speak with a registered migration agent
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          This is general information only and not migration advice.
        </p>
      </section>
    </main>
  );
}
