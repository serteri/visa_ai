"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, Languages, Scale, ShieldCheck } from "lucide-react";

import { AgentReferralCta } from "@/components/sections/agent-referral-cta";
import { ComplianceNotice } from "@/components/sections/compliance-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { languages } from "@/lib/languages";
import { useTranslation } from "@/contexts/language-context";

const trustIndicatorKeys = [
  { key: "trustIndicators.gov", icon: ShieldCheck },
  { key: "trustIndicators.info", icon: Scale },
  { key: "trustIndicators.languages", icon: Languages },
  { key: "trustIndicators.referral", icon: CheckCircle2 },
];

const howItWorksKeys = [
  "howItWorks.step1",
  "howItWorks.step2",
  "howItWorks.step3",
  "howItWorks.step4",
];

const categoryKeys = [
  "categories.student",
  "categories.skilled",
  "categories.employer",
  "categories.partner",
  "categories.visitor",
  "categories.regional",
];

export function HomeContent() {
  const params = useParams();
  const locale = params.locale as string;
  const { t } = useTranslation();

  return (
    <section className="section-shell space-y-10">
      <section className="grid gap-8 rounded-2xl border border-border/60 bg-white/80 p-6 shadow-[0_18px_50px_-24px_rgba(2,6,23,0.35)] backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-10">
        <div className="space-y-5">
          <Badge variant="secondary">{t("hero.trustBadge")}</Badge>
          <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-5xl">
            {t("hero.headline")}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("hero.subheadline")}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={`/${locale}/checker`}>{t("hero.cta")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="#how-it-works">{t("hero.secondary")}</Link>
            </Button>
          </div>
        </div>

        <div className="grid-veil rounded-xl border border-border/60 bg-[#f8fbff] p-6">
          <h2 className="mb-4 text-lg font-semibold">{t("hero.headline")}</h2>
          <div className="space-y-3">
            {trustIndicatorKeys.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  className="flex items-center gap-3 rounded-lg bg-white/80 px-4 py-3"
                >
                  <Icon className="size-4 text-primary" />
                  <span className="text-sm font-medium">{t(item.key)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("howItWorks.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {howItWorksKeys.map((key, index) => (
              <div key={key} className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">
                  {index + 1}
                </div>
                <p className="text-sm text-muted-foreground">{t(key)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("categories.title")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {categoryKeys.map((key) => (
              <div key={key} className="rounded-lg bg-muted px-3 py-2 text-sm">
                {t(key)}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("languages.title")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {languages.map((language) => (
              <div
                key={language.code}
                className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 ${
                  language.enabled
                    ? "bg-white"
                    : "bg-muted opacity-60"
                }`}
              >
                <span className={`text-sm font-medium ${language.enabled ? "text-foreground" : "text-muted-foreground"}`}>
                  {language.localLabel}
                </span>
                <Badge
                  variant={language.enabled ? "default" : "secondary"}
                  className="text-xs"
                >
                  {language.enabled ? "Available" : "Coming Soon"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <ComplianceNotice />
          <div className="flex justify-end">
            <Button asChild variant="ghost">
              <Link href={`/${locale}/legal`}>{t("footer.legal")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section>
        <AgentReferralCta />
      </section>
    </section>
  );
}
