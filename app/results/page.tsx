"use client";

import Link from "next/link";

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
                <p className="rounded-lg bg-muted p-3">{pathway.caution}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("results.missing")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {mockMissingInformation.map((item) => (
                <p key={item}>- {item}</p>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("results.risks")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {mockRiskFlags.map((item) => (
                <p key={item}>- {item}</p>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("results.next")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              {t("results.nextText")}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button>{t("results.requestReferral")}</Button>
              <Button asChild variant="outline">
                <Link href="/checker">{t("results.editAnswers")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <ComplianceNotice />

        <section>
          <AgentReferralCta />
        </section>
      </section>
    </main>
  );
}
