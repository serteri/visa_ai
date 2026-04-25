"use client";

import Link from "next/link";

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

type ResultsContentProps = {
  locale: string;
  matchedVisas: MatchedVisa[];
  goal?: string;
};

export function ResultsContent({ locale, matchedVisas, goal = "" }: ResultsContentProps) {
  const { t } = useTranslation();
  const normalisedGoal = goal.toLowerCase();
  const hasSkilledPrVisa = matchedVisas.some(
    (visa) => visa.subclass === "189" || visa.subclass === "190"
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
        </div>

        <AgentReferralCta />
        <ComplianceNotice />
      </section>
    </main>
  );
}
