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
    <section className="space-y-24 pb-24">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        {/* Deep background color and grid */}
        <div className="absolute inset-0 -z-20 bg-slate-50 dark:bg-zinc-950"></div>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        
        {/* Glow Effects */}
        <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[120px] dark:bg-indigo-500/10"></div>
        <div className="absolute right-0 top-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-purple-500/20 blur-[100px] dark:bg-purple-500/10"></div>

        <div className="section-shell flex flex-col items-center text-center">
          <Badge variant="secondary" className="mb-6 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200/50 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
            {t("hero.trustBadge")}
          </Badge>
          
          <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-7xl lg:leading-[1.1]">
            <span className="block">{t("hero.headline").split(" ")[0]} {t("hero.headline").split(" ")[1]}</span>
            <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
              {t("hero.headline").split(" ").slice(2).join(" ") || "Your Visa Roadmap"}
            </span>
          </h1>
          
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400 sm:text-xl">
            {t("hero.subheadline")}
          </p>
          
          <div className="mt-10 flex w-full max-w-md flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="h-14 px-8 text-base bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:scale-105 hover:shadow-indigo-500/50 border-0">
              <Link href={`/${locale}/full-check`}>
                {locale === "tr" ? "Hemen Başla" : locale === "zh-Hans" ? "立即开始" : "Get Free Report"}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base bg-white/50 backdrop-blur-sm transition-all duration-300 hover:bg-slate-100 dark:bg-zinc-900/50 dark:border-zinc-800 dark:hover:bg-zinc-800">
              <Link href={`/${locale}/assistant`}>{t("hero.secondary")}</Link>
            </Button>
          </div>

          {/* Trust Signals under CTA */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-slate-500 dark:text-slate-400 sm:gap-10">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">✓</span>
              {t("socialProof.users")}
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">🛡️</span>
              {t("socialProof.mara")}
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">📊</span>
              {t("socialProof.dha")}
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Box */}
      <section className="section-shell">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {locale === "tr" ? "Raporda Neler Var?" : locale === "zh-Hans" ? "报告内容" : "What's in the Report?"}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            {locale === "tr" ? "Gerçek verilere dayalı, yapay zeka destekli detaylı analiz." : locale === "zh-Hans" ? "基于真实数据和AI驱动的详细分析。" : "Detailed analysis driven by AI and real data."}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Bento Card 1 */}
          <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              <span className="text-2xl">✨</span>
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">
              {locale === "tr" ? "Puan Hesaplayıcı" : locale === "zh-Hans" ? "积分计算器" : "Points Calculator"}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {locale === "tr" 
                ? "DHA kurallarına göre tahmini puanınızı ve potansiyel ek puan fırsatlarını anında hesaplayın." 
                : locale === "zh-Hans" 
                ? "根据DHA规则，即刻计算您的预估分数以及潜在的加分机会。" 
                : "Instantly calculate your estimated points and potential bonus point opportunities based on DHA rules."}
            </p>
            <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
          </div>

          {/* Bento Card 2 */}
          <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">
              {locale === "tr" ? "Gizli Riskler" : locale === "zh-Hans" ? "潜在风险" : "Hidden Risks"}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {locale === "tr" 
                ? "Profilinizdeki eksik belgeleri ve red riskini artırabilecek zayıf noktaları önceden tespit edin." 
                : locale === "zh-Hans" 
                ? "提前发现您档案中缺失的材料以及可能增加拒签风险的弱点。" 
                : "Identify missing documents and weak spots in your profile that could increase your risk of refusal."}
            </p>
            <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-purple-500/10 blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
          </div>

          {/* Bento Card 3 */}
          <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <span className="text-2xl">🗺️</span>
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">
              {locale === "tr" ? "Maliyet Yol Haritası" : locale === "zh-Hans" ? "费用路线图" : "Cost Roadmap"}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {locale === "tr" 
                ? "Vize ücretleri, danışmanlık masrafları ve diğer tüm süreç maliyetlerini detaylı bir şekilde planlayın." 
                : locale === "zh-Hans" 
                ? "详细规划签证费、咨询费以及整个流程中的其他所有成本。" 
                : "Detailed planning of visa fees, consultation costs, and all other expenses involved in your journey."}
            </p>
            <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
          </div>
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
