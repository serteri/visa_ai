"use client";

import Link from "next/link";

import { ComplianceNotice } from "@/components/sections/compliance-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function buildFullCheckHref(input: {
  locale: string;
  matchedVisas: MatchedVisa[];
  goal: string;
}) {
  const params = new URLSearchParams({
    source: "results",
  });
  const visaInterest = input.matchedVisas
    .slice(0, 3)
    .map((visa) => visa.subclass)
    .join(",");

  if (visaInterest) params.set("visaInterest", visaInterest);
  if (input.goal.trim()) params.set("goal", input.goal.trim());

  return `/${input.locale}/full-check?${params.toString()}`;
}

export function ResultsContent({ locale, matchedVisas, goal = "" }: ResultsContentProps) {
  const isTr = locale === "tr";
  const copy = {
    badge: isTr ? "Hızlı kontrol" : "Quick check",
    title: isTr ? "Hızlı yol sonuçları" : "Quick pathway results",
    note: isTr
      ? "Bu sonuçlar yalnızca olası yol alanlarını gösterir. Risk analizi, belge hazırlığı, puan incelemesi veya hazırlık planı içermez."
      : "These results show possible pathway areas only. They do not include risk analysis, document readiness, points review, or a preparation plan.",
    noMatch: isTr
      ? "Net bir yol bulunamadı. Kişisel koşullar için kayıtlı bir göç danışmanı görüşü ilgili olabilir."
      : "No clear pathway found. Registered migration agent input may be relevant for personal circumstances.",
    viewDetails: isTr ? "Detayları görüntüle" : "View details",
    ctaTitle: isTr ? "Daha kapsamlı inceleme gerekli mi?" : "Need a deeper review?",
    ctaText: isTr
      ? "Tam hazırlık raporu; vize yolu karşılaştırması, risk göstergeleri, kanıt hazırlığı, tahmini maliyet yol haritası, önerilen sonraki adımlar ve PDF indirme içerecek şekilde tasarlanmıştır."
      : "The full readiness report is designed to include pathway comparison, risk indicators, evidence readiness, financial roadmap, suggested next steps, and PDF download.",
    ctaButton: isTr ? "Hazırlık raporunuzu oluşturun" : "Generate your readiness report",
    agentButton: isTr
      ? "Kayıtlı bir göç danışmanı ile görüş"
      : "Speak with a registered migration agent",
    retake: isTr ? "Hızlı kontrolü tekrar yap" : "Retake quick check",
  };
  const visibleMatchedVisas = matchedVisas.slice(0, 3);
  const fullCheckHref = buildFullCheckHref({ locale, matchedVisas, goal });

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <div className="space-y-3">
          <Badge variant="secondary">{copy.badge}</Badge>
          <h1 className="text-3xl font-bold sm:text-4xl">{copy.title}</h1>
          <p className="max-w-3xl rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:text-base">
            {copy.note}
          </p>
        </div>

        {matchedVisas.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">{copy.noMatch}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {visibleMatchedVisas.map((visa) => (
              <Card key={visa.subclass}>
                <CardHeader className="pb-3">
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

                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">{visa.match_reason}</p>
                  {visa.is_database_record ? (
                    <Button asChild variant="default" size="sm">
                      <Link href={`/${locale}/visas/${visa.subclass}`}>
                        {copy.viewDetails}
                      </Link>
                    </Button>
                  ) : visa.source_url ? (
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={visa.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {copy.viewDetails}
                      </a>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="border-primary/50 bg-primary/5 shadow-sm ring-1 ring-primary/10">
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle>{copy.ctaTitle}</CardTitle>
              <Badge variant="secondary">{isTr ? "Detaylı rapor" : "Full report"}</Badge>
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">{copy.ctaText}</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={fullCheckHref}>{copy.ctaButton}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/${locale}/agent-referral`}>{copy.agentButton}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href={`/${locale}/checker`}>{copy.retake}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/${locale}/agent-referral`}>{copy.agentButton}</Link>
          </Button>
        </div>

        <ComplianceNotice />
      </section>
    </main>
  );
}
