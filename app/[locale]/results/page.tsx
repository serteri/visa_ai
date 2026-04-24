"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { AgentReferralCta } from "@/components/sections/agent-referral-cta";
import { ComplianceNotice } from "@/components/sections/compliance-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  mockMissingInformation,
  mockPathwaySuggestions,
  mockRiskFlags,
} from "@/lib/mock-visa-data";
import { useTranslation } from "@/contexts/language-context";

export default function ResultsPage() {
  const params = useParams();
  const locale = params.locale as string;
  const { t } = useTranslation();

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

        <div className="grid gap-5 lg:grid-cols-2">
          {mockPathwaySuggestions.map((pathway, index) => (
            <Card key={pathway.title}>
              <CardHeader>
                <CardTitle>
                  {t("results.pathway")} {index + 1}: {pathway.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{pathway.rationale}</p>
                <p>
                  <strong className="text-foreground">{t("results.requirementsLabel")}:</strong>{" "}
                  {pathway.requirements}
                </p>
                {pathway.caution && (
                  <p className="rounded bg-orange-50 p-2 text-orange-900">
                    <strong>{t("results.caution")}:</strong> {pathway.caution}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("results.missingInfo")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {mockMissingInformation.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("results.riskFlags")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {mockRiskFlags.map((flag) => (
                <li key={flag} className="flex items-start gap-2">
                  <span className="text-orange-500">!</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href={`/${locale}`}>{t("results.startOver")}</Link>
          </Button>
          <Button asChild>
            <Link href={`/${locale}/checker`}>{t("results.retake")}</Link>
          </Button>
        </div>

        <AgentReferralCta />
        <ComplianceNotice />
      </section>
    </main>
  );
}
