"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { AgentReferralCta } from "@/components/sections/agent-referral-cta";
import { ComplianceNotice } from "@/components/sections/compliance-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/contexts/language-context";
import type { MatchedVisa } from "@/lib/visa/types";

const CONFIDENCE_LABELS: Record<MatchedVisa["confidence"], string> = {
  high: "High relevance",
  medium: "Medium relevance",
  low: "Low relevance",
};

const CONFIDENCE_VARIANTS: Record<
  MatchedVisa["confidence"],
  "default" | "secondary" | "outline"
> = {
  high: "default",
  medium: "secondary",
  low: "outline",
};

const LOCKED_REPORT_BENEFITS = [
  "Risk indicators",
  "Document checklist",
  "Suggested next steps",
];

const LOCKED_PREVIEW_BLOCKS = [
  {
    title: "Risk indicators",
    content: "Potential risks based on your situation",
  },
  {
    title: "Document readiness",
    content: "Checklist of documents you may need",
  },
  {
    title: "Suggested next steps",
    content: "Structured next steps based on your answers",
  },
];

type ResultsContentProps = {
  locale: string;
  matchedVisas: MatchedVisa[];
  goal?: string;
};

export function ResultsContent({ locale, matchedVisas, goal = "" }: ResultsContentProps) {
  const { t } = useTranslation();
  const normalisedGoal = goal.toLowerCase();
  const hasSkilledPrVisa = matchedVisas.some(
    (visa) => visa.subclass === "189" || visa.subclass === "190" || visa.subclass === "491"
  );
  const showPointsCalculatorCta =
    hasSkilledPrVisa ||
    normalisedGoal.includes("permanent") ||
    normalisedGoal.includes("pr") ||
    normalisedGoal.includes("migrate") ||
    normalisedGoal.includes("skilled migration");
  const pointsCtaText =
    locale === "tr"
      ? "Nitelikli göç puanınızı tahmin edin"
      : "Estimate your skilled migration points";
  const occupationCtaText =
    locale === "tr"
      ? "Mesleginizi kontrol edin"
      : "Check your occupation";
  const agentCtaText =
    locale === "tr"
      ? "Kayitli bir goc danismani ile gorusun"
      : "Speak with a registered migration agent";

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <div className="space-y-3">
          <Badge variant="secondary">{t("results.heading")}</Badge>
          <h1 className="text-3xl font-bold sm:text-4xl">{t("results.title")}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
            {t("results.subtitle")}
          </p>
        </div>

        {matchedVisas.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No clear pathway found. You may need to speak with a migration agent.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {matchedVisas.map((visa) => (
              <Card key={visa.subclass}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{visa.visa_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Subclass {visa.subclass}
                      </p>
                    </div>
                    <Badge variant={CONFIDENCE_VARIANTS[visa.confidence]}>
                      {CONFIDENCE_LABELS[visa.confidence]}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 text-sm">
                  <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-foreground">
                    This pathway may be relevant based on your answers.
                  </p>

                  <p className="text-muted-foreground">{visa.match_reason}</p>

                  {visa.purpose && (
                    <p>
                      <strong className="text-foreground">Purpose:</strong>{" "}
                      {visa.purpose}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {visa.is_database_record ? (
                      <Button asChild variant="default" size="sm">
                        <Link href={`/${locale}/visas/${visa.subclass}`}>
                          View details
                        </Link>
                      </Button>
                    ) : visa.source_url ? (
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={visa.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View on official site
                        </a>
                      </Button>
                    ) : null}
                    {visa.pdf_snapshot_url && (
                      <Button asChild variant="ghost" size="sm">
                        <a
                          href={visa.pdf_snapshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View PDF snapshot
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <section className="space-y-4">
          <div className="space-y-2">
            <Badge variant="outline">Limited insight</Badge>
            <h2 className="text-2xl font-bold">You&apos;ve unlocked basic pathway results</h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              This quick check shows possible pathways. A full readiness report includes deeper insights. This is general information only.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {LOCKED_PREVIEW_BLOCKS.map((block) => (
              <Card key={block.title} className="relative overflow-hidden border-dashed">
                <CardHeader className="opacity-45 blur-[1px]">
                  <CardTitle className="text-base">{block.title}</CardTitle>
                </CardHeader>
                <CardContent className="opacity-45 blur-[1px]">
                  <p className="text-sm text-muted-foreground">{block.content}</p>
                </CardContent>
                <div className="absolute inset-0 flex items-center justify-center bg-background/65 p-4 backdrop-blur-[1px]">
                  <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-2 text-sm font-medium shadow-sm">
                    <LockKeyhole className="size-4 text-primary" />
                    <span>Available in full report</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle>Want a more detailed review?</CardTitle>
              <Badge variant="secondary">Locked</Badge>
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Your quick check shows possible pathways. A full readiness report can help you review risks, documents, and next steps.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {LOCKED_REPORT_BENEFITS.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-center gap-2 rounded-md border border-primary/20 bg-background/80 px-3 py-2 text-sm"
                >
                  <LockKeyhole className="size-4 text-primary" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href={`/${locale}/full-check`}>Unlock full report</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/${locale}/agent-referral`}>
                  Speak with a registered migration agent
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href={`/${locale}`}>{t("results.startOver")}</Link>
          </Button>
          <Button asChild>
            <Link href={`/${locale}/checker`}>{t("results.retake")}</Link>
          </Button>
          {showPointsCalculatorCta && (
            <Button asChild variant="secondary">
              <Link href={`/${locale}/points-calculator`}>{pointsCtaText}</Link>
            </Button>
          )}
          {hasSkilledPrVisa && (
            <Button asChild variant="secondary">
              <Link href={`/${locale}/occupation-checker`}>{occupationCtaText}</Link>
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link href={`/${locale}/agent-referral`}>{agentCtaText}</Link>
          </Button>
        </div>

        <AgentReferralCta />
        <ComplianceNotice />
      </section>
    </main>
  );
}
