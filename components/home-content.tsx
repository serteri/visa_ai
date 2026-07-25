"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BrainCircuit, ClipboardList, EyeOff, Lock, ShieldCheck, Zap } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/contexts/language-context";
import { PdfDownloadModal, type PdfProduct } from "@/components/PdfDownloadModal";
import { SampleReportMockup } from "@/components/SampleReportMockup";
import { StripeCheckoutButton } from "@/components/stripe-checkout-button";
import { activeCountries, countryComplianceBadge, DISPLAY_START_SLOTS } from "@/lib/countries";

const FREE_DOWNLOADS_FALLBACK = 18;

interface HomeContentProps {
  /**
   * Server-computed free-download count (see app/[locale]/(main)/page.tsx),
   * used to seed state so the initial client render already matches the
   * server-rendered HTML. Re-fetching this on the client after mount was
   * what caused the old 18 -> 17 flicker; there is deliberately no client-side
   * refetch here anymore — a fresh value only requires reloading the page,
   * which already happens naturally on next navigation since the value is
   * revalidated server-side every 60s (see getCachedPdfLeadDownloadStats).
   */
  initialFreeDownloadsLeft?: number;
  /**
   * Marketing "urgency" counter for the hero scarcity banner — computed
   * server-side (see app/[locale]/(main)/page.tsx) from the real backend
   * quota, but intentionally not the raw remaining-spots number itself.
   * Starts at 14 and decreases by 1 per real submission, floored at 2. Same
   * seed-once pattern as initialFreeDownloadsLeft — avoids the hydration flicker.
   */
  initialAssessmentSlotsLeft?: number;
}

const ASSESSMENT_SLOTS_FALLBACK = 14;

export function HomeContent({ initialFreeDownloadsLeft, initialAssessmentSlotsLeft }: HomeContentProps) {
  const params = useParams();
  const locale = params.locale as string;
  const { t } = useTranslation();

  function handleScrollToPdfSection(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const section = document.getElementById("pdf-download-section");
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Shared free-download counter — drives the CTA copy on BOTH product cards below.
  const [freeDownloadsLeft] = useState(initialFreeDownloadsLeft ?? FREE_DOWNLOADS_FALLBACK);
  const [assessmentSlotsLeft] = useState(initialAssessmentSlotsLeft ?? ASSESSMENT_SLOTS_FALLBACK);
  const [activePdfModal, setActivePdfModal] = useState<PdfProduct | null>(null);

  const hasFreeSlots = freeDownloadsLeft > 0;
  const hasFreeAssessmentSlots = assessmentSlotsLeft > 0;

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
          <a
            href="#pdf-download-section"
            onClick={handleScrollToPdfSection}
            className="mb-6 inline-flex w-full max-w-3xl items-center justify-center rounded-2xl border border-sky-200/80 bg-gradient-to-r from-cyan-50 via-white to-emerald-50 px-4 py-3 text-center text-sm font-semibold text-slate-800 shadow-lg shadow-sky-100/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sky-200/70 sm:px-6 sm:py-4 sm:text-base"
          >
            {locale === "tr" ? (
              <>
                📘 Ücretsiz 80 Sayfalık Avustralya & Kanada PR Kılavuzu 2026 Yayınlandı! <strong className="ml-1">Hemen İndirin →</strong>
              </>
            ) : (
              <>
                📘 Free 80-Page Australia & Canada PR Guide 2026 is now available! <strong className="ml-1">Get Free Copy →</strong>
              </>
            )}
          </a>

          <Badge variant="secondary" className="mb-6 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200/50 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
            {t("hero.trustBadge")}
          </Badge>
          
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl lg:leading-[1.1]">
            {t("hero.headline")}
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400 sm:text-xl">
            {t("hero.subheadline")}
          </p>

          {/* Dual country-specific CTAs — the two monetization paths. */}
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row md:justify-start">
            <Link
              href={`/${locale}/full-check?country=AU`}
              className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-10 py-5 text-xl font-extrabold text-white shadow-2xl shadow-indigo-500/40 transition-all duration-300 hover:scale-105 hover:shadow-indigo-500/60 sm:px-12 sm:py-6 sm:text-2xl"
            >
              {t("hero.btnAustralia")}
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href={`/${locale}/full-check?country=CA`}
              className="group inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-indigo-600 bg-white px-10 py-5 text-xl font-extrabold text-indigo-700 shadow-2xl shadow-indigo-500/10 transition-all duration-300 hover:scale-105 hover:bg-indigo-50 hover:shadow-indigo-500/20 dark:bg-zinc-900 dark:text-indigo-300 dark:hover:bg-zinc-800 sm:px-12 sm:py-6 sm:text-2xl"
            >
              {t("hero.btnCanada")}
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>

          {/* Shared scarcity/price-anchor text for both country CTAs above —
              same styling as the PDF section's scarcity banner. The "20" is a
              static reference to the real backend quota (MAX_FREE_REPORTS);
              the bold number is the marketing urgency counter, which starts
              at 14 and ticks down per real submission (see page.tsx). */}
          {hasFreeAssessmentSlots && (
            <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800 shadow-sm dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-300">
              <span>
                🔥{" "}
                {locale === "tr" ? (
                  <>
                    İki ülke için ortak — bugün sadece{" "}
                    <span className="text-emerald-700/60 line-through">{DISPLAY_START_SLOTS}</span>{" "}
                    <strong className="text-base">{assessmentSlotsLeft}</strong> ücretsiz analiz
                    hakkı kaldı! (Normalde $49 — ücretsiz haklar bittiğinde bu fiyata dönecektir)
                  </>
                ) : locale === "zh-Hans" ? (
                  <>
                    两国共享 — 今日仅剩{" "}
                    <span className="text-emerald-700/60 line-through">{DISPLAY_START_SLOTS}</span>{" "}
                    <strong className="text-base">{assessmentSlotsLeft}</strong>{" "}
                    个免费评估名额！（原价 $49 — 免费名额用尽后将恢复原价）
                  </>
                ) : (
                  <>
                    Shared across both countries — only{" "}
                    <span className="text-emerald-700/60 line-through">{DISPLAY_START_SLOTS}</span>{" "}
                    <strong className="text-base">{assessmentSlotsLeft}</strong> free assessment
                    slots left! (Normally $49 — reverts to this price once free slots run out)
                  </>
                )}
              </span>
            </div>
          )}

          {/* Trust Signals under CTA */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-slate-500 dark:text-slate-400 sm:gap-10">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">✓</span>
              {t("socialProof.users")}
            </div>
            {activeCountries.map((code) => (
              <div key={code} className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">🛡️</span>
                {countryComplianceBadge[code][locale === "tr" ? "tr" : locale === "zh-Hans" ? "zh-Hans" : "en"]}
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">📊</span>
              {t("socialProof.dha")}
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Authority: Stats Bar */}
      <section className="border-y border-slate-200 bg-slate-100/70 py-10 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="section-shell">
          <div className="grid grid-cols-2 gap-4 divide-slate-200 sm:grid-cols-4 sm:gap-8 sm:divide-x dark:divide-zinc-800">
            {[
              {
                value: "707+",
                label:
                  locale === "tr"
                    ? "İncelenen Meslek"
                    : locale === "zh-Hans"
                      ? "已分析职业"
                      : "Occupations Analyzed",
              },
              {
                value: locale === "tr" ? "Gerçek Zamanlı" : locale === "zh-Hans" ? "实时" : "Real-Time",
                label:
                  locale === "tr"
                    ? "ANZSCO ve NOC Verisi"
                    : locale === "zh-Hans"
                      ? "ANZSCO 与 NOC 数据"
                      : "ANZSCO & NOC Data",
              },
              {
                value: locale === "tr" ? "AI Destekli" : locale === "zh-Hans" ? "AI 驱动" : "AI-Powered",
                label:
                  locale === "tr"
                    ? "Eşleştirme Hassasiyeti"
                    : locale === "zh-Hans"
                      ? "匹配精准度"
                      : "Matching Precision",
              },
              {
                value: "2026",
                label:
                  locale === "tr" ? "Göç Verileri" : locale === "zh-Hans" ? "移民数据" : "Immigration Data",
              },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center justify-center gap-1 px-2 text-center">
                <p className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  {stat.value}
                </p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-sm dark:text-slate-400">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Authority: Official Data Sources — typography-only, no
          government crests/logos, to stay clear of copyright/endorsement
          issues while still signalling authoritative data provenance. */}
      <section className="section-shell py-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {locale === "tr"
              ? "Resmi Göç Verileriyle Desteklenmektedir:"
              : locale === "zh-Hans"
                ? "由官方移民数据提供支持："
                : "Powered by Official Immigration Data:"}
          </p>
          <div className="flex flex-col items-center justify-center gap-6 md:flex-row md:flex-wrap md:gap-x-10 md:gap-y-4">
            <div className="flex flex-col items-center gap-2 text-center text-slate-500 opacity-80 grayscale transition-all hover:opacity-100 hover:grayscale-0 dark:text-slate-400 md:flex-row md:text-left">
              <span className="text-xl">🇦🇺</span>
              <span className="text-sm font-bold tracking-tight sm:text-base">
                {locale === "tr"
                  ? "Avustralya Hükümeti İçişleri Bakanlığı (ANZSCO)"
                  : locale === "zh-Hans"
                    ? "澳大利亚政府内政部（ANZSCO）"
                    : "Australian Govt. Department of Home Affairs (ANZSCO)"}
              </span>
            </div>
            <div className="flex flex-col items-center gap-2 text-center text-slate-500 opacity-80 grayscale transition-all hover:opacity-100 hover:grayscale-0 dark:text-slate-400 md:flex-row md:text-left">
              <span className="text-xl">🇨🇦</span>
              <span className="text-sm font-bold tracking-tight sm:text-base">
                {locale === "tr"
                  ? "Kanada Hükümeti IRCC (NOC)"
                  : locale === "zh-Hans"
                    ? "加拿大政府 IRCC（NOC）"
                    : "Government of Canada IRCC (NOC)"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Authority: How It Works */}
      <section className="section-shell">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {locale === "tr" ? "Nasıl Çalışır?" : locale === "zh-Hans" ? "工作原理" : "How It Works"}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            {locale === "tr"
              ? "Profilden vize yoluna üç basit adımda."
              : locale === "zh-Hans"
                ? "三步即可从个人资料找到签证路径。"
                : "From profile to pathway in three simple steps."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {[
            {
              icon: ClipboardList,
              title:
                locale === "tr"
                  ? "Profil ve Mesleki Eşleştirme"
                  : locale === "zh-Hans"
                    ? "档案与职业匹配"
                    : "Profile & Professional Mapping",
              description:
                locale === "tr"
                  ? "Yaşınızı, İngilizce seviyenizi, eğitiminizi ve iş tanımlarınızı girin. Sistemimiz kariyer profilinizi anında resmi ANZSCO (Avustralya) veya NOC (Kanada) meslek veri tabanlarıyla eşleştirir."
                  : locale === "zh-Hans"
                    ? "输入您的年龄、英语水平、学历和具体工作职责。系统会立即将您的职业背景与官方 ANZSCO（澳大利亚）或 NOC（加拿大）职业数据库进行匹配。"
                    : "Input your age, English proficiency, education, and specific duties. Our system instantly maps your career profile to official ANZSCO (Australia) or NOC (Canada) occupational databases.",
              color: "indigo",
            },
            {
              icon: BrainCircuit,
              title:
                locale === "tr"
                  ? "Yasal ve Puan Uyumluluk Kontrolleri"
                  : locale === "zh-Hans"
                    ? "法律与分数合规审查"
                    : "Legal & Point Compliance Checks",
              description:
                locale === "tr"
                  ? "Yapay zeka motorumuz geçmişinizi sıkı göçmenlik mevzuatlarına göre değerlendirir. Yasal sınırları çapraz kontrol eder, puan barajlarını doğrular ve başvurulara binlerce dolar harcamadan önce karşınıza çıkabilecek tüm engelleri raporlar."
                  : locale === "zh-Hans"
                    ? "我们的引擎依据严格的移民法规评估您的背景，交叉核对法定门槛、验证打分限制，并在您为申请投入大量资金之前，提前标记出任何可能构成\"硬性门槛（Hard Gate）\"的障碍。"
                    : "The engine evaluates your background against strict immigration frameworks. It cross-references legal thresholds, verifies point limits, and flags any 'Hard Gate' roadblocks before you spend thousands on applications.",
              color: "purple",
            },
            {
              icon: Zap,
              title:
                locale === "tr"
                  ? "Uygulanabilir Strateji Raporu"
                  : locale === "zh-Hans"
                    ? "可执行策略报告"
                    : "Actionable Strategy Report",
              description:
                locale === "tr"
                  ? "Kişiselleştirilmiş ve veriye dayalı puan dökümünüzü, kesin uygunluk durumunuzu ve geçme puanlarına ulaşmak için profilinizi tam olarak nasıl optimize edeceğinizi gösteren hedefli matematiksel projeksiyonları anında alın."
                  : locale === "zh-Hans"
                    ? "获取个性化的、基于数据的分数明细、明确的资格状态，以及有针对性的数学预测，精确展示如何优化您的档案以达到及格分数。"
                    : "Get your personalized data-driven score breakdown, absolute eligibility status, and targeted mathematical projections showing exactly how to optimize your profile to reach passing scores.",
              color: "emerald",
            },
          ].map((step, index) => (
            <div
              key={step.title}
              className="relative flex flex-col gap-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 md:gap-4 dark:border-zinc-800 dark:bg-zinc-900/50"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    step.color === "indigo"
                      ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                      : step.color === "purple"
                        ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                        : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                  }`}
                >
                  <step.icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-bold text-slate-300 dark:text-zinc-700">0{index + 1}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{step.title}</h3>
              <p className="text-slate-600 dark:text-slate-400">{step.description}</p>
            </div>
          ))}
        </div>

        {/* Sample Report Mockup — pure Tailwind, no image assets. Sits right
            below the steps so visitors see the payoff immediately. */}
        <div className="mt-14">
          <p className="mb-6 text-center text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {locale === "tr"
              ? "Raporunuz Bu Şekilde Görünecek"
              : locale === "zh-Hans"
                ? "您的报告将是这样的"
                : "Here's What Your Report Looks Like"}
          </p>
          <SampleReportMockup locale={locale} />
        </div>

        {/* Security & Privacy badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-slate-200 pt-8 text-sm font-medium text-slate-500 dark:border-zinc-800 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <EyeOff className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            {locale === "tr"
              ? "Anonim Değerlendirme"
              : locale === "zh-Hans"
                ? "匿名评估"
                : "Anonymous Assessment"}
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            {locale === "tr"
              ? "Üçüncü Taraflarla Veri Paylaşımı Yok"
              : locale === "zh-Hans"
                ? "不与第三方共享数据"
                : "No 3rd-Party Data Sharing"}
          </div>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            {locale === "tr"
              ? "Banka Düzeyinde Şifreleme"
              : locale === "zh-Hans"
                ? "银行级加密"
                : "Bank-Level Encryption"}
          </div>
        </div>
      </section>

      {/* Case Studies: real scenarios the engine has resolved, right below
          How It Works so the abstract steps get grounded in concrete outcomes. */}
      <section className="section-shell">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {locale === "tr"
              ? "Son Derinlemesine Değerlendirmeler"
              : locale === "zh-Hans"
                ? "近期深度评估案例"
                : "Recent Deep-Dive Assessments"}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            {locale === "tr"
              ? "Yapay zeka motorumuzun bu hafta çözdüğü gerçek senaryolar."
              : locale === "zh-Hans"
                ? "本周我们的AI引擎已解决的真实场景。"
                : "Real scenarios our AI engine has resolved this week."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              flag: "🇦🇺",
              country: "AU",
              name: "Michael K.",
              role: locale === "tr" ? "Yazılım Mühendisi, 36 Yaşında" : locale === "zh-Hans" ? "软件工程师，36岁" : "Software Engineer, Age 36",
              badgeText: locale === "tr" ? "485 Uygun Değil → 190 (VIC) %70 Eşleşme" : locale === "zh-Hans" ? "485 不符合 → 190（维州）70% 匹配" : "485 Ineligible → 190 (VIC) 70% Match",
              badgeColor: "amber",
              narrative:
                locale === "tr"
                  ? "1 Temmuz 2026 yaş sınırı (35) nedeniyle 485 için Uygun Değil olarak işaretlendi. Sistem profili otomatik olarak %70 eşleşme olasılığıyla Subclass 190'a (Victoria) yönlendirdi."
                  : locale === "zh-Hans"
                    ? "由于2026年7月1日起的35岁年龄上限，被标记为485签证不符合资格。系统自动将档案重新定向至190类别（维多利亚州），匹配概率为70%。"
                    : "Flagged as Ineligible for 485 due to the 1 July 2026 age limit (35). System automatically redirected profile to Subclass 190 (Victoria) with a 70% match probability.",
            },
            {
              flag: "🇨🇦",
              country: "CA",
              name: "Priya R.",
              role: locale === "tr" ? "Full-Stack Geliştirici" : locale === "zh-Hans" ? "全栈开发工程师" : "Full-Stack Developer",
              badgeText: locale === "tr" ? "CRS 468 → +20 Puan Simülasyonu" : locale === "zh-Hans" ? "CRS 468 → 模拟 +20 分" : "CRS 468 → +20 pts Simulated",
              badgeColor: "indigo",
              narrative:
                locale === "tr"
                  ? "468 Express Entry (FSW) puanı hesaplandı. Sistem sınır riskleri tespit etti ve Superior İngilizce eğitim seçenekleriyle +20 puanlık bir artışı simüle etti."
                  : locale === "zh-Hans"
                    ? "计算出468分的快速通道（FSW）评分。系统识别出临界风险，并模拟了通过\"优秀英语\"培训方案获得的+20分提升。"
                    : "Calculated a 468 Express Entry (FSW) score. System identified boundary risks and simulated a +20 point boost via Superior English training options.",
            },
            {
              flag: "🇦🇺",
              country: "AU",
              name: "Ahmet Y.",
              role: locale === "tr" ? "Makine Mühendisi, Aile Hesabı" : locale === "zh-Hans" ? "机械工程师，家庭账户" : "Mechanical Engineer, Family Account",
              badgeText: locale === "tr" ? "🚨 4.890 $ Risk Yakalandı" : locale === "zh-Hans" ? "🚨 发现 $4,890 风险" : "🚨 $4,890 Risk Caught",
              badgeColor: "red",
              narrative:
                locale === "tr"
                  ? "Eşin fonksiyonel İngilizce kanıtı olmadığı için gizli 4.890 dolarlık ikinci taksit vize ücreti riskini tespit etti; başvuru öncesinde binlerce dolar tasarruf sağladı."
                  : locale === "zh-Hans"
                    ? "由于配偶缺乏功能性英语证明，系统发现了隐藏的4,890美元第二期签证费用风险，在递交申请前节省了数千美元。"
                    : "Caught a hidden $4,890 second-instalment visa charge hazard because the spouse lacked functional English proof, saving thousands before lodgement.",
            },
            {
              flag: "🇦🇺",
              country: "AU",
              name: "Sarah L.",
              role: locale === "tr" ? "Dijital Uzman → Pazarlama Müdürü" : locale === "zh-Hans" ? "数字专员 → 市场经理" : "Digital Specialist → Marketing Manager",
              badgeText: locale === "tr" ? "SA Adaylık Oranı: %25 → %80" : locale === "zh-Hans" ? "SA提名几率：25% → 80%" : "SA Nomination Odds: 25% → 80%",
              badgeColor: "emerald",
              narrative:
                locale === "tr"
                  ? "Genel görevleri kapalı bir eyalet listesinden ANZSCO 225113'e (Reklamcılık Uzmanı) yeniden hizalayarak Güney Avustralya adaylık olasılığını %25'ten %80'e yükseltti."
                  : locale === "zh-Hans"
                    ? "将通用职责从已关闭的州清单重新匹配至ANZSCO 225113（广告专员），将南澳大利亚州提名几率从25%提升至80%。"
                    : "Realigned general duties from a closed state list to ANZSCO 225113 (Advertising Specialist), lifting South Australia nomination odds from 25% to 80%.",
            },
          ].map((item) => (
            <div
              key={item.name}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-7"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-2xl">{item.flag}</span>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.role}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-zinc-800 dark:text-slate-400">
                  {locale === "tr" ? "Vaka İncelemesi" : locale === "zh-Hans" ? "案例研究" : "Case Study"}
                </span>
              </div>

              <span
                className={`mb-3 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${
                  item.badgeColor === "amber"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                    : item.badgeColor === "indigo"
                      ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
                      : item.badgeColor === "red"
                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                }`}
              >
                {item.badgeText}
              </span>

              <p className="line-clamp-3 text-sm leading-relaxed text-slate-600 sm:line-clamp-none dark:text-slate-400">
                {item.narrative}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Dual-Product Guide Grid */}
      <section id="pdf-download-section" className="section-shell scroll-mt-24">
        {/* Scarcity alert banner — total remaining slots across BOTH editions */}
        <div
          className={`mb-6 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-center text-sm font-semibold shadow-sm ${
            hasFreeSlots
              ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800/50 dark:bg-sky-900/20 dark:text-sky-300"
              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300"
          }`}
        >
          {hasFreeSlots ? (
            <span>
              📚{" "}
              {locale === "tr" ? (
                <>
                  Her iki PDF rehber için geçerli — sadece{" "}
                  <strong>{freeDownloadsLeft}</strong> ücretsiz indirme hakkı kaldı!
                </>
              ) : locale === "zh-Hans" ? (
                <>
                  两本 PDF 指南通用 — 仅剩 <strong>{freeDownloadsLeft}</strong> 个免费下载名额！
                </>
              ) : (
                <>
                  Shared across both PDF guides — only{" "}
                  <strong>{freeDownloadsLeft}</strong> free download slots left!
                </>
              )}
            </span>
          ) : (
            <span>
              💳{" "}
              {locale === "tr"
                ? "Ücretsiz kota doldu — her iki rehber de artık $9.99."
                : locale === "zh-Hans"
                  ? "免费名额已满 — 两本指南现价 $9.99。"
                  : "Free quota is full — both guides are now $9.99."}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Product 1 — Turkish Edition */}
          <div className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-blue-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-200/50 dark:border-blue-800/60 dark:bg-zinc-900/70 dark:hover:border-blue-600">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl pointer-events-none transition-all group-hover:bg-blue-500/20" />

            <div className="relative flex flex-1 flex-col items-center gap-4 p-5 text-center sm:p-8 md:items-start md:text-left">
              <div className="flex items-center gap-2">
                <span className="text-3xl">🇹🇷</span>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {locale === "tr"
                    ? "Türkçe Baskı · 2026"
                    : locale === "zh-Hans"
                      ? "土耳其语版 · 2026"
                      : "Turkish Edition · 2026"}
                </span>
              </div>

              <h2 className="text-3xl font-black leading-tight text-slate-900 dark:text-white">
                Avustralya PR Başvuru Rehberi
              </h2>

              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
                {locale === "tr" ? (
                  <>
                    Türk profesyoneller için hazırlanmış, yetenekli göç (skilled
                    migration) süreçlerini adım adım anlatan <strong>80+ sayfalık</strong>{" "}
                    kapsamlı Türkçe rehber.
                  </>
                ) : locale === "zh-Hans" ? (
                  <>
                    专为土耳其专业人士打造，逐步讲解技术移民流程的
                    <strong>80+ 页</strong>土耳其语综合指南。
                  </>
                ) : (
                  <>
                    A comprehensive <strong>80+ page</strong> Turkish-language guide
                    walking skilled migration candidates through the entire pathway,
                    built specifically for Turkish professionals.
                  </>
                )}
              </p>

              <ul className="w-full space-y-2 text-left text-sm text-slate-600 dark:text-slate-400">
                <li className="flex flex-row items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-blue-500">✓</span>
                  <span>
                    {locale === "tr"
                      ? "80+ sayfa, 13 bölüm, 2026 güncel verileri"
                      : locale === "zh-Hans"
                        ? "80+ 页，13 章，2026 最新数据"
                        : "80+ pages across 13 chapters, 2026 data"}
                  </span>
                </li>
                <li className="flex flex-row items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-blue-500">✓</span>
                  <span>
                    {locale === "tr"
                      ? "189 / 190 / 491 puan testi ve ANZSCO kod rehberi"
                      : locale === "zh-Hans"
                        ? "189 / 190 / 491 打分测试与 ANZSCO 职业代码指南"
                        : "189 / 190 / 491 points test and ANZSCO code guide"}
                  </span>
                </li>
                <li className="flex flex-row items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-blue-500">✓</span>
                  <span>
                    {locale === "tr"
                      ? "Türk başvurucular için özelleştirilmiş belge rehberi"
                      : locale === "zh-Hans"
                        ? "为土耳其申请人定制的材料清单"
                        : "Document checklist tailored to Turkish applicants"}
                  </span>
                </li>
              </ul>

              <div className="mt-auto w-full pt-4">
                {hasFreeSlots ? (
                  <Button
                    size="lg"
                    onClick={() => setActivePdfModal("turkish")}
                    className="w-full bg-blue-600 font-bold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700"
                  >
                    {locale === "tr"
                      ? "📥 Ücretsiz İndir"
                      : locale === "zh-Hans"
                        ? "📥 免费下载"
                        : "📥 Free Download"}
                  </Button>
                ) : (
                  <StripeCheckoutButton
                    productType="pdf_book"
                    locale={locale}
                    className="w-full bg-blue-600 font-bold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700"
                    label={
                      locale === "tr"
                        ? "💳 Şimdi Satın Al — $9.99"
                        : locale === "zh-Hans"
                          ? "💳 立即购买 — $9.99"
                          : "💳 Buy Now — $9.99"
                    }
                  />
                )}
                <p className="mt-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                  {hasFreeSlots
                    ? locale === "tr"
                      ? <>Normal fiyatı <strong className="text-slate-700 dark:text-slate-300">$9.99</strong> — ücretsiz kota bitince bu fiyata geçer</>
                      : locale === "zh-Hans"
                        ? <>原价 <strong className="text-slate-700 dark:text-slate-300">$9.99</strong> — 免费名额用完后恢复该价格</>
                        : <>Normally <strong className="text-slate-700 dark:text-slate-300">$9.99</strong> — reverts to this price once free slots run out</>
                    : locale === "tr"
                      ? "Ücretsiz kota doldu — anında indirme bağlantısı e-postanıza gönderilir"
                      : locale === "zh-Hans"
                        ? "免费名额已满 — 下载链接将立即发送到您的邮箱"
                        : "Free quota reached — instant download link sent to your email"}
                </p>
              </div>
            </div>
          </div>

          {/* Product 2 — Global English Edition */}
          <div className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-emerald-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-200/50 dark:border-emerald-800/60 dark:bg-zinc-900/70 dark:hover:border-emerald-600">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none transition-all group-hover:bg-emerald-500/20" />

            <div className="relative flex flex-1 flex-col items-center gap-4 p-5 text-center sm:p-8 md:items-start md:text-left">
              <div className="flex items-center gap-2">
                <span className="text-3xl">🌏</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {locale === "tr"
                    ? "Global İngilizce Baskı · 2026"
                    : locale === "zh-Hans"
                      ? "全球英文版 · 2026"
                      : "Global English Edition · 2026"}
                </span>
              </div>

              <h2 className="text-3xl font-black leading-tight text-slate-900 dark:text-white">
                The Ultimate Australia Migration &amp; Living Blueprint
              </h2>

              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
                {locale === "tr" ? (
                  <>
                    Uluslararası profesyoneller için: Skilled Migration yol
                    haritası, Öğrenci Vizesi (Subclass 500) köprüsü ve{" "}
                    <strong>2026 yaşam maliyeti</strong> verileri tek rehberde.
                  </>
                ) : locale === "zh-Hans" ? (
                  <>
                    面向国际专业人士：技术移民路径、学生签证（500 类别）过渡方案，以及
                    <strong>2026 年生活成本</strong>数据，全部收录于一册。
                  </>
                ) : (
                  <>
                    Built for an international audience: the full Skilled
                    Migration pathway, the Student Visa (Subclass 500) bridge to
                    PR, and <strong>2026 cost of living</strong> data in one
                    guide.
                  </>
                )}
              </p>

              <ul className="w-full space-y-2 text-left text-sm text-slate-600 dark:text-slate-400">
                <li className="flex flex-row items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-emerald-500">✓</span>
                  <span>
                    {locale === "tr"
                      ? "Skilled Migration (189/190/491) — puan testi ve strateji"
                      : locale === "zh-Hans"
                        ? "技术移民（189/190/491）— 打分测试与策略"
                        : "Skilled Migration (189/190/491) — points test & strategy"}
                  </span>
                </li>
                <li className="flex flex-row items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-emerald-500">✓</span>
                  <span>
                    {locale === "tr"
                      ? "Öğrenci Vizesi (Subclass 500) → PR köprü stratejisi"
                      : locale === "zh-Hans"
                        ? "学生签证（500 类别）→ PR 过渡策略"
                        : "Student Visa (Subclass 500) → PR bridge strategy"}
                  </span>
                </li>
                <li className="flex flex-row items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-emerald-500">✓</span>
                  <span>
                    {locale === "tr"
                      ? "Sydney, Melbourne, Brisbane, Adelaide için 2026 yaşam maliyeti"
                      : locale === "zh-Hans"
                        ? "悉尼、墨尔本、布里斯班、阿德莱德 2026 年生活成本"
                        : "2026 cost of living for Sydney, Melbourne, Brisbane, Adelaide"}
                  </span>
                </li>
              </ul>

              <div className="mt-auto w-full pt-4">
                {hasFreeSlots ? (
                  <Button
                    size="lg"
                    onClick={() => setActivePdfModal("global")}
                    className="w-full bg-emerald-600 font-bold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-700"
                  >
                    {locale === "tr"
                      ? "📥 Ücretsiz İndir"
                      : locale === "zh-Hans"
                        ? "📥 免费下载"
                        : "📥 Free Download"}
                  </Button>
                ) : (
                  <StripeCheckoutButton
                    productType="pdf_book_global"
                    locale={locale}
                    className="w-full bg-emerald-600 font-bold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-700"
                    label={
                      locale === "tr"
                        ? "💳 Şimdi Satın Al — $9.99"
                        : locale === "zh-Hans"
                          ? "💳 立即购买 — $9.99"
                          : "💳 Buy Now — $9.99"
                    }
                  />
                )}
                <p className="mt-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                  {hasFreeSlots
                    ? locale === "tr"
                      ? <>Normal fiyatı <strong className="text-slate-700 dark:text-slate-300">$9.99</strong> — ücretsiz kota bitince bu fiyata geçer</>
                      : locale === "zh-Hans"
                        ? <>原价 <strong className="text-slate-700 dark:text-slate-300">$9.99</strong> — 免费名额用完后恢复该价格</>
                        : <>Normally <strong className="text-slate-700 dark:text-slate-300">$9.99</strong> — reverts to this price once free slots run out</>
                    : locale === "tr"
                      ? "Ücretsiz kota doldu — anında indirme bağlantısı e-postanıza gönderilir"
                      : locale === "zh-Hans"
                        ? "免费名额已满 — 下载链接将立即发送到您的邮箱"
                        : "Free quota reached — instant download link sent to your email"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PdfDownloadModal
        locale={locale}
        product={activePdfModal ?? "turkish"}
        open={activePdfModal !== null}
        onClose={() => setActivePdfModal(null)}
      />

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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {/* Bento Card 1 */}
          <div className="group relative flex flex-row items-start gap-4 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-xl sm:p-8 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              <span className="text-2xl">✨</span>
            </div>
            <div>
              <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
                {locale === "tr" ? "Puan Hesaplayıcı" : locale === "zh-Hans" ? "积分计算器" : "Points Calculator"}
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {locale === "tr"
                  ? "Tahmini puanınızı ve potansiyel ek puan fırsatlarını gerçek göç kurallarına göre anında hesaplayın."
                  : locale === "zh-Hans"
                  ? "根据移民规则即刻计算您的预估分数以及潜在的加分机会。"
                  : "Instantly calculate your estimated points and potential bonus point opportunities based on real immigration rules."}
              </p>
            </div>
            <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
          </div>

          {/* Bento Card 2 */}
          <div className="group relative flex flex-row items-start gap-4 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-xl sm:p-8 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <span className="text-2xl">🔍</span>
            </div>
            <div>
              <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
                {locale === "tr" ? "Gizli Riskler" : locale === "zh-Hans" ? "潜在风险" : "Hidden Risks"}
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {locale === "tr"
                  ? "Profilinizdeki eksik belgeleri ve red riskini artırabilecek zayıf noktaları önceden tespit edin."
                  : locale === "zh-Hans"
                  ? "提前发现您档案中缺失的材料以及可能增加拒签风险的弱点。"
                  : "Identify missing documents and weak spots in your profile that could increase your risk of refusal."}
              </p>
            </div>
            <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-purple-500/10 blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
          </div>

          {/* Bento Card 3 */}
          <div className="group relative flex flex-row items-start gap-4 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-xl sm:p-8 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <span className="text-2xl">🗺️</span>
            </div>
            <div>
            <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
              {locale === "tr" ? "Maliyet Yol Haritası" : locale === "zh-Hans" ? "费用路线图" : "Cost Roadmap"}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {locale === "tr"
                ? "Vize ücretleri, danışmanlık masrafları ve diğer tüm süreç maliyetlerini detaylı bir şekilde planlayın."
                : locale === "zh-Hans" 
                ? "详细规划签证费、咨询费以及整个流程中的其他所有成本。" 
                : "Detailed planning of visa fees, consultation costs, and all other expenses involved in your journey."}
            </p>
            </div>
            <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
          </div>
        </div>
      </section>

      {/* SEO / Pain-Point FAQ — sits just above the global footer */}
      <section className="section-shell">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {locale === "tr"
              ? "Vize Yolları Hakkında Sıkça Sorulan Sorular"
              : locale === "zh-Hans"
                ? "关于签证路径的常见问题"
                : "Frequently Asked Questions About Visa Pathways"}
          </h2>
        </div>

        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-slate-50/60 px-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 sm:px-8">
          <Accordion className="divide-y divide-slate-200 dark:divide-zinc-800">
            {[
              {
                value: "points-calculation",
                question:
                  locale === "tr"
                    ? "Avustralya yetenekli göç puanımı nasıl hesaplayabilirim?"
                    : locale === "zh-Hans"
                      ? "如何计算我的澳大利亚技术移民积分？"
                      : "How can I calculate my Australian skilled migration points?",
                answer:
                  locale === "tr"
                    ? "Ücretsiz Puan Hesaplayıcımızı kullanarak Subclass 189, 190 ve 491 yetenekli göç vizeleri için puanınızı anında tahmin edin. Araç; yaş, İngilizce seviyesi, iş deneyimi ve eyalet adaylığı bonus puanlarını dikkate alarak, tam başvuru yapmadan önce PR uygunluğunuz hakkında doğru bir tablo sunar."
                    : locale === "zh-Hans"
                      ? "使用我们的免费积分计算器，即时估算您在189、190和491类技术移民签证下的分数。该工具综合考虑年龄、英语水平、工作经验以及州提名加分，帮助您在正式提交申请前准确了解自己的永居（PR）资格。"
                      : "Use our free Points Calculator to instantly estimate your score for Subclass 189, 190, and 491 skilled migration visas. The tool factors in age, English level, work experience, and state nomination bonus points to give you an accurate picture of your PR eligibility before you invest time in a full application.",
              },
              {
                value: "csit-threshold",
                question:
                  locale === "tr"
                    ? "Avustralya sponsorlu vizeleri için yeni gelir eşikleri (CSIT) nelerdir?"
                    : locale === "zh-Hans"
                      ? "澳大利亚担保签证的新收入门槛（CSIT）是多少？"
                      : "What are the new income thresholds (CSIT) for Australian sponsored visas?",
                answer:
                  locale === "tr"
                    ? "1 Temmuz 2026 tarihinden itibaren, Talep Üzerine Beceri Vizesi (Subclass 482) için Temel Beceri Gelir Eşiği (CSIT) AUD 79.423'e yükseldi. Sponsorlar, aday gösterilen kişinin yıllık kazancının bu eşiği karşıladığını veya aştığını garanti etmelidir. Fiyatlandırma ve uygunluk hakkında tam döküm için Subclass 482 sayfamıza göz atın.":
                    locale === "zh-Hans"
                      ? "自2026年7月1日起，技能需求签证（482类别）的核心技能收入门槛（CSIT）已提高至79,423澳元。担保方必须保证被提名人的年收入达到或超过该门槛。请查看我们的482类别页面，了解完整的费用和资格详情。"
                      : "From 1 July 2026, the Core Skills Income Threshold (CSIT) for the Skills in Demand visa (Subclass 482) rose to AUD 79,423. Sponsors must guarantee the nominee's annual earnings meet or exceed this threshold. Check our Subclass 482 page for the full breakdown of pricing and eligibility.",
              },
              {
                value: "ai-matcher",
                question:
                  locale === "tr"
                    ? "AI Vize Yolu Eşleştirici, Kanada ve Avustralya için nasıl çalışır?"
                    : locale === "zh-Hans"
                      ? "AI签证路径匹配器如何为加拿大和澳大利亚工作？"
                      : "How does the AI Visa Pathway Matcher work for Canada and Australia?",
                answer:
                  locale === "tr"
                    ? "AI Vize Yolu Eşleştiricimiz, CV'nizi Avustralya için ANZSCO ve Kanada için NOC olmak üzere 707'den fazla resmi meslek koduyla karşılaştırarak en güçlü vize yollarınızı anında belirler. Kanada için profilinizi Express Entry ve IRCC gerekliliklerine göre hizalar; Avustralya için ise mesleğinizi PR yolları için kullanılan yetenekli meslek listeleriyle karşılaştırır."
                    : locale === "zh-Hans"
                      ? "我们的AI签证路径匹配器将您的简历与707多个官方职业代码进行比对——澳大利亚使用ANZSCO，加拿大使用NOC——即时识别您最强的签证路径。针对加拿大，它会将您的资料与Express Entry及IRCC要求进行匹配；针对澳大利亚，它会将您的职业与用于永居路径的技术职业清单进行交叉核对。"
                      : "Our AI Visa Pathway Matcher analyzes your CV against 707+ official occupation codes — ANZSCO for Australia and NOC for Canada — to instantly identify your strongest visa pathways. For Canada, it aligns your profile with Express Entry and IRCC requirements; for Australia, it cross-references your occupation against the skilled occupation lists used for PR pathways.",
              },
              {
                value: "occupation-list",
                question:
                  locale === "tr"
                    ? "Mesleğim Avustralya veya Kanada yetenekli meslek listesinde mi?"
                    : locale === "zh-Hans"
                      ? "我的职业是否在澳大利亚或加拿大的技术职业清单上？"
                      : "Is my occupation on the Australian or Canadian skilled occupation list?",
                answer:
                  locale === "tr"
                    ? "Ücretsiz ANZSCO/NOC meslek bulucumuzda arama yaparak anında kontrol edin. Mesleğiniz ilgili yetenekli meslek listesinde ise, eyalet adaylığı veya bölgesel bir vize (Avustralya'da Subclass 491 veya Kanada'da bir Eyalet Adaylık Programı akışı) için uygun olabilirsiniz; bunların ikisi de bonus puan veya kalıcı oturuma daha hızlı bir yol sunabilir."
                    : locale === "zh-Hans"
                      ? "使用我们的免费ANZSCO/NOC职业查找工具即时查询。如果您的职业在相应的技术职业清单上，您可能有资格申请州提名或地区签证（澳大利亚的491类别，或加拿大的省提名计划通道），两者都可能提供加分或更快的永居路径。"
                      : "Search our free ANZSCO/NOC occupation finder to check instantly. If your occupation is on the relevant skilled occupation list, you may be eligible for state nomination or a regional visa (Subclass 491 in Australia, or a Provincial Nominee Program stream in Canada), both of which can offer bonus points or a faster pathway to permanent residence.",
              },
            ].map((faq) => (
              <AccordionItem key={faq.value} value={faq.value}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Social Proof: organic testimonials, right above the final CTA. */}
      <section className="section-shell">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {locale === "tr"
              ? "Kullanıcılarımız Ne Diyor?"
              : locale === "zh-Hans"
                ? "用户评价"
                : "What Our Users Are Saying"}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {[
            {
              initials: "DL",
              quote:
                locale === "tr"
                  ? "Temmuz kurallarına göre temel uygunluğumu kontrol etmek için bir göç danışmanına 300 dolar ödemek üzereydim. Bu yapay zeka, partnerimin İngilizce puan açığını 2 dakikada yakaladı. Muhteşem bir araç."
                  : locale === "zh-Hans"
                    ? "我本来打算花300美元请移民顾问帮我核实7月新规下的基本资格。这个AI在2分钟内就发现了我配偶的英语分数缺口。非常出色的工具。"
                    : "I was about to pay a migration agent $300 just to check my basic eligibility for the July rules. This AI caught my partner's English point gap in 2 minutes. Outstanding tool.",
              name: "David L.",
              location: locale === "zh-Hans" ? "悉尼" : "Sydney",
            },
            {
              initials: "EM",
              quote:
                locale === "tr"
                  ? "Kanada için NOC kod eşleştirmesi inanılmaz derecede doğru. Her zamanki danışmanlık satış konuşması olmadan Express Entry puanlarımın net bir dökümünü verdi."
                  : locale === "zh-Hans"
                    ? "加拿大的NOC代码匹配非常精准。它清晰地为我列出了快速通道积分明细，完全没有中介常见的推销套路。"
                    : "The NOC code mapping for Canada is incredibly accurate. It gave me a clear breakdown of my Express Entry points without the usual agency sales pitch.",
              name: "Elena M.",
              location: locale === "zh-Hans" ? "温哥华" : "Vancouver",
            },
            {
              initials: "MT",
              quote:
                locale === "tr"
                  ? "Kafa karıştırıcı göç forumlarını okumakla geçecek haftaları kurtarıyor. Victoria'nın en güncel eyalet kriterlerine göre tam olarak nerede durduğumu bilmek oyunun kurallarını değiştiriyor."
                  : locale === "zh-Hans"
                    ? "省去了在令人困惑的移民论坛上阅读数周的时间。清楚了解自己在维多利亚州最新州提名标准下的位置，真正改变了一切。"
                    : "Saves weeks of reading confusing immigration forums. Knowing exactly where I stand against Victoria's latest state criteria is a game-changer.",
              name: "Marcus T.",
              location: locale === "zh-Hans" ? "墨尔本" : "Melbourne",
            },
          ].map((review) => (
            <div
              key={review.name}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-7"
            >
              <div className="flex items-center gap-1 text-amber-400" aria-hidden="true">
                {"★★★★★"}
              </div>
              <p className="flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                &ldquo;{review.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 border-t border-slate-100 pt-4 dark:border-zinc-800">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
                  {review.initials}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{review.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{review.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </section>
  );
}
