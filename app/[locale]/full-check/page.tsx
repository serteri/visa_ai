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
    quick: "Basic guidance",
    full: "Included",
  },
  {
    label: "Document checklist",
    quick: "No detailed checklist",
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
};

export default async function FullCheckPage({ params }: FullCheckPageProps) {
  const { locale } = await params;

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr] lg:items-start">
          <div className="space-y-4">
            <Badge variant="secondary">Premium</Badge>
            <h1 className="text-3xl font-bold sm:text-4xl">
              Full Visa Readiness Report
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
              A deeper review of your situation across pathway fit, risk indicators, document readiness, and suggested next steps.
            </p>
          </div>

          <Card className="border-primary/40 bg-primary/5">
            <CardHeader>
              <CardTitle>Get early access</CardTitle>
            </CardHeader>
            <CardContent>
              <FullCheckWaitlistForm locale={locale} />
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
              A full report is designed to make the next conversation more organized and practical.
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
