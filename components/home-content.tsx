"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Bot,
  BriefcaseBusiness,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  HeartHandshake,
  Languages,
  MapPinned,
  Scale,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

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

const supportedPathwayKeys = [
  { title: "pathways.500.title", text: "pathways.500.text", icon: GraduationCap },
  { title: "pathways.482.title", text: "pathways.482.text", icon: BriefcaseBusiness },
  { title: "pathways.189.title", text: "pathways.189.text", icon: ClipboardCheck },
  { title: "pathways.190.title", text: "pathways.190.text", icon: UserCheck },
  { title: "pathways.491.title", text: "pathways.491.text", icon: MapPinned },
  { title: "pathways.820801.title", text: "pathways.820801.text", icon: HeartHandshake },
];

const actionCardKeys = [
  {
    title: "cta.checker.title",
    text: "cta.checker.text",
    label: "cta.checker.label",
    href: "checker",
    icon: ClipboardCheck,
  },
  {
    title: "cta.assistant.title",
    text: "cta.assistant.text",
    label: "cta.assistant.label",
    href: "assistant",
    icon: Bot,
  },
  {
    title: "cta.points.title",
    text: "cta.points.text",
    label: "cta.points.label",
    href: "points-calculator",
    icon: Calculator,
  },
  {
    title: "cta.occupation.title",
    text: "cta.occupation.text",
    label: "cta.occupation.label",
    href: "occupation-checker",
    icon: Search,
  },
  {
    title: "cta.agent.title",
    text: "cta.agent.text",
    label: "cta.agent.label",
    href: "agent-referral",
    icon: HeartHandshake,
  },
];

const fullCheckCtaCards = [
  {
    title: "premiumCta.quick.title",
    text: "premiumCta.quick.text",
    label: "premiumCta.quick.label",
    href: "checker",
    icon: ClipboardCheck,
  },
  {
    title: "premiumCta.full.title",
    text: "premiumCta.full.text",
    label: "premiumCta.full.label",
    href: "full-check",
    icon: FileText,
    badge: "premiumCta.full.badge",
  },
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
              <Link href={`/${locale}/assistant`}>{t("hero.secondary")}</Link>
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

      <section id="supported-pathways" className="space-y-4">
        <div className="space-y-2">
          <Badge variant="outline">{t("pathways.badge")}</Badge>
          <h2 className="text-2xl font-bold">{t("pathways.title")}</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t("pathways.subtitle")}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {supportedPathwayKeys.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title}>
                <CardContent className="flex gap-3 p-4">
                  <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div className="space-y-1">
                    <p className="font-semibold">{t(item.title)}</p>
                    <p className="text-sm text-muted-foreground">{t(item.text)}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section id="next-actions" className="space-y-4">
        <div className="space-y-2">
          <Badge variant="outline">{t("cta.badge")}</Badge>
          <h2 className="text-2xl font-bold">{t("cta.title")}</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          {actionCardKeys.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.href}>
                <CardHeader className="space-y-3">
                  <Icon className="size-5 text-primary" />
                  <CardTitle className="text-base">{t(item.title)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{t(item.text)}</p>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/${locale}/${item.href}`}>{t(item.label)}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section id="full-check-preview" className="space-y-4">
        <div className="space-y-2">
          <Badge variant="outline">{t("premiumCta.badge")}</Badge>
          <h2 className="text-2xl font-bold">{t("premiumCta.title")}</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t("premiumCta.subtitle")}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {fullCheckCtaCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.href}
                className={item.href === "full-check" ? "border-primary/40 bg-primary/5" : ""}
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <Icon className="size-5 text-primary" />
                    {item.badge && <Badge variant="secondary">{t(item.badge)}</Badge>}
                  </div>
                  <CardTitle className="text-lg">{t(item.title)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{t(item.text)}</p>
                  <Button
                    asChild
                    variant={item.href === "full-check" ? "default" : "outline"}
                    className="w-full sm:w-auto"
                  >
                    <Link href={`/${locale}/${item.href}`}>{t(item.label)}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
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
            <CardTitle>{t("assistantCta.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("assistantCta.text")}</p>
            <Button asChild>
              <Link href={`/${locale}/assistant`}>{t("assistantCta.label")}</Link>
            </Button>
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
