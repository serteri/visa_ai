"use client";

import { ComplianceNotice } from "@/components/sections/compliance-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/contexts/language-context";

export default function LegalPage() {
  const { t } = useTranslation();

  return (
    <main className="ambient-bg flex-1 py-16">
      <section className="section-shell space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {t("legal.heading")}
          </p>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            {t("legal.title")}
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            {t("legal.subtitle")}
          </p>
        </div>

        <ComplianceNotice />

        <Card>
          <CardHeader>
            <CardTitle>{t("legal.whatDoes")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{t("legal.whatDoesText1")}</p>
            <p>{t("legal.whatDoesText2")}</p>
            <p>{t("legal.whatDoesText3")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("legal.whatDoesNot")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{t("legal.whatDoesNotText1")}</p>
            <p>{t("legal.whatDoesNotText2")}</p>
            <p>{t("legal.whatDoesNotText3")}</p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
