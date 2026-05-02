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
  { title: "pathways.485.title", text: "pathways.485.text", icon: BriefcaseBusiness },
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
    <section className="section-shell space-y-12">
      {/* Hero Container */}
      <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/40 p-6 shadow-2xl backdrop-blur-xl md:p-14">
        {/* Subtle Grid & Mesh Gradient Background */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[80px]"></div>

        <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div className="space-y-6">
            <Badge variant="secondary" className="bg-indigo-50/50 text-indigo-700 hover:bg-indigo-50/80 border-indigo-200/50">
              {t("hero.trustBadge")}
            </Badge>
            
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:leading-[1.1]">
              <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                {t("hero.headline")}
              </span>
            </h1>
            
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {t("hero.subheadline")}
            </p>
            
            <div className="space-y-4 pt-2">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="group w-full sm:w-auto bg-violet-600 text-white hover:bg-violet-700 shadow-[0_0_40px_-10px_rgba(124,58,237,0.5)] transition-all hover:shadow-[0_0_60px_-15px_rgba(124,58,237,0.7)] hover:scale-[1.02]">
                  <Link href={`/${locale}/checker`} className="flex items-center gap-2">
                    {t("hero.cta")}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-all">
                  <Link href={`/${locale}/assistant`}>{t("hero.secondary")}</Link>
                </Button>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🔒</span> {t("hero.noCreditCard")}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base">⚡️</span> {t("hero.instantPdf")}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/60 p-6 shadow-xl backdrop-blur-md">
            <h2 className="mb-5 text-lg font-semibold">{t("hero.headline")}</h2>
            <div className="space-y-3">
              {trustIndicatorKeys.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className="flex items-center gap-3 rounded-xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-black/5"
                  >
                    <Icon className="size-5 text-violet-600" />
                    <span className="text-sm font-medium">{t(item.key)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Strip */}
      <section className="flex flex-wrap items-center justify-center gap-8 border-y border-border/40 bg-muted/20 py-6 text-sm font-medium text-muted-foreground sm:gap-16">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span> {t("socialProof.dha")}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">🛡️</span> {t("socialProof.mara")}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">👥</span> {t("socialProof.users")}
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

      <section id="full-check" className="space-y-4">
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
