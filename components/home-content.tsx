"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BrainCircuit, ClipboardList, EyeOff, Lock, ShieldCheck, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/contexts/language-context";
import { PdfDownloadModal, type PdfProduct } from "@/components/PdfDownloadModal";
import { StripeCheckoutButton } from "@/components/stripe-checkout-button";
import { activeCountries, countryComplianceBadge } from "@/lib/countries";

const FREE_DOWNLOADS_FALLBACK = 18;

export function HomeContent() {
  const params = useParams();
  const locale = params.locale as string;
  const { t } = useTranslation();

  // Shared free-download counter — drives the CTA copy on BOTH product cards below.
  // Seeded with the known fallback, then reconciled against the real shared quota
  // (both guides draw from one combined pool — see /api/pdf-download).
  const [freeDownloadsLeft, setFreeDownloadsLeft] = useState(FREE_DOWNLOADS_FALLBACK);
  const [activePdfModal, setActivePdfModal] = useState<PdfProduct | null>(null);

  useEffect(() => {
    fetch("/api/pdf-download")
      .then((r) => r.json())
      .then((data: { freeRemaining?: number }) => {
        if (typeof data.freeRemaining === "number") {
          setFreeDownloadsLeft(data.freeRemaining);
        }
      })
      .catch(() => {
        // Keep the fallback value — the CTA still works, it just won't reflect
        // real-time quota until the next successful fetch.
      });
  }, []);

  const hasFreeSlots = freeDownloadsLeft > 0;

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
          
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl lg:leading-[1.1]">
            {t("hero.headline")}
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400 sm:text-xl">
            {t("hero.subheadline")}
          </p>

          {/* ONE primary CTA — everything else on this page defers to this. */}
          <Link
            href={`/${locale}/ai-visa-match`}
            className="group mt-10 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-10 py-5 text-xl font-extrabold text-white shadow-2xl shadow-indigo-500/40 transition-all duration-300 hover:scale-105 hover:shadow-indigo-500/60 sm:px-12 sm:py-6 sm:text-2xl"
          >
            ⚡ {t("hero.cta")}
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>

          {/* Secondary actions — deliberately subtle text links, not buttons,
              so they never compete with the primary CTA above. */}
          <p className="mt-5 text-sm text-slate-400">
            {t("hero.secondaryPrefix")}{" "}
            <Link
              href={`/${locale}/full-check?country=AU`}
              className="font-medium text-slate-500 underline underline-offset-2 transition-colors hover:text-indigo-600 dark:text-slate-400"
            >
              {t("hero.secondaryAU")}
            </Link>
            {" · "}
            <Link
              href={`/${locale}/full-check?country=CA`}
              className="font-medium text-slate-500 underline underline-offset-2 transition-colors hover:text-indigo-600 dark:text-slate-400"
            >
              {t("hero.secondaryCA")}
            </Link>
            {" · "}
            <Link
              href={`/${locale}/tools/points-calculator`}
              className="font-medium text-slate-500 underline underline-offset-2 transition-colors hover:text-indigo-600 dark:text-slate-400"
            >
              {locale === "tr"
                ? "Puan Hesaplayıcı"
                : locale === "zh-Hans"
                  ? "积分计算器"
                  : "Points Calculator"}
            </Link>
          </p>

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
          <div className="grid grid-cols-2 gap-8 divide-slate-200 text-center sm:grid-cols-4 sm:divide-x dark:divide-zinc-800">
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
              <div key={stat.label} className="px-2">
                <p className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-sm dark:text-slate-400">
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
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            <div className="flex items-center gap-2 text-slate-500 opacity-80 grayscale transition-all hover:opacity-100 hover:grayscale-0 dark:text-slate-400">
              <span className="text-xl">🇦🇺</span>
              <span className="text-sm font-bold tracking-tight sm:text-base">
                {locale === "tr"
                  ? "Avustralya Hükümeti İçişleri Bakanlığı (ANZSCO)"
                  : locale === "zh-Hans"
                    ? "澳大利亚政府内政部（ANZSCO）"
                    : "Australian Govt. Department of Home Affairs (ANZSCO)"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 opacity-80 grayscale transition-all hover:opacity-100 hover:grayscale-0 dark:text-slate-400">
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

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: ClipboardList,
              title:
                locale === "tr" ? "Profil Bilgisi" : locale === "zh-Hans" ? "输入个人资料" : "Profile Input",
              description:
                locale === "tr"
                  ? "Geçmişinizi hızlıca anlatın — meslek, yaş ve hedefleriniz."
                  : locale === "zh-Hans"
                    ? "快速告诉我们您的背景——职业、年龄和目标。"
                    : "Quickly tell us your background — occupation, age, and goals.",
              color: "indigo",
            },
            {
              icon: BrainCircuit,
              title: locale === "tr" ? "AI Analizi" : locale === "zh-Hans" ? "AI 分析" : "AI Analysis",
              description:
                locale === "tr"
                  ? "Motorumuz profilinizi resmi göç verileriyle karşılaştırır."
                  : locale === "zh-Hans"
                    ? "我们的引擎将您的资料与官方移民数据进行交叉比对。"
                    : "Our engine cross-references your profile against official immigration data.",
              color: "purple",
            },
            {
              icon: Zap,
              title: locale === "tr" ? "Anında Sonuç" : locale === "zh-Hans" ? "即时结果" : "Instant Results",
              description:
                locale === "tr"
                  ? "Uygun olduğunuz vize yollarını hemen keşfedin."
                  : locale === "zh-Hans"
                    ? "立即发现您符合条件的签证路径。"
                    : "Discover your eligible visa pathways immediately.",
              color: "emerald",
            },
          ].map((step, index) => (
            <div
              key={step.title}
              className="relative rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"
            >
              <span className="absolute right-6 top-6 text-sm font-bold text-slate-300 dark:text-zinc-700">
                0{index + 1}
              </span>
              <div
                className={`mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${
                  step.color === "indigo"
                    ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                    : step.color === "purple"
                      ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                      : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                }`}
              >
                <step.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{step.title}</h3>
              <p className="text-slate-600 dark:text-slate-400">{step.description}</p>
            </div>
          ))}
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

      {/* Dual-Product Guide Grid */}
      <section className="section-shell">
        {/* Scarcity alert banner — total remaining slots across BOTH editions */}
        <div
          className={`mb-6 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-center text-sm font-semibold shadow-sm ${
            hasFreeSlots
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-300"
              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300"
          }`}
        >
          {hasFreeSlots ? (
            <span>
              🔥{" "}
              {locale === "tr" ? (
                <>
                  Her iki rehberde de geçerli — sadece{" "}
                  <strong>{freeDownloadsLeft}</strong> ücretsiz indirme hakkı kaldı!
                </>
              ) : locale === "zh-Hans" ? (
                <>
                  两本指南通用 — 仅剩 <strong>{freeDownloadsLeft}</strong> 个免费下载名额！
                </>
              ) : (
                <>
                  Shared across both editions — only{" "}
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

            <div className="relative flex flex-1 flex-col gap-4 p-8">
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

              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-500">✓</span>
                  {locale === "tr"
                    ? "80+ sayfa, 13 bölüm, 2026 güncel verileri"
                    : locale === "zh-Hans"
                      ? "80+ 页，13 章，2026 最新数据"
                      : "80+ pages across 13 chapters, 2026 data"}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-500">✓</span>
                  {locale === "tr"
                    ? "189 / 190 / 491 puan testi ve ANZSCO kod rehberi"
                    : locale === "zh-Hans"
                      ? "189 / 190 / 491 打分测试与 ANZSCO 职业代码指南"
                      : "189 / 190 / 491 points test and ANZSCO code guide"}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-500">✓</span>
                  {locale === "tr"
                    ? "Türk başvurucular için özelleştirilmiş belge rehberi"
                    : locale === "zh-Hans"
                      ? "为土耳其申请人定制的材料清单"
                      : "Document checklist tailored to Turkish applicants"}
                </li>
              </ul>

              <div className="mt-auto pt-4">
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

            <div className="relative flex flex-1 flex-col gap-4 p-8">
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

              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-emerald-500">✓</span>
                  {locale === "tr"
                    ? "Skilled Migration (189/190/491) — puan testi ve strateji"
                    : locale === "zh-Hans"
                      ? "技术移民（189/190/491）— 打分测试与策略"
                      : "Skilled Migration (189/190/491) — points test & strategy"}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-emerald-500">✓</span>
                  {locale === "tr"
                    ? "Öğrenci Vizesi (Subclass 500) → PR köprü stratejisi"
                    : locale === "zh-Hans"
                      ? "学生签证（500 类别）→ PR 过渡策略"
                      : "Student Visa (Subclass 500) → PR bridge strategy"}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-emerald-500">✓</span>
                  {locale === "tr"
                    ? "Sydney, Melbourne, Brisbane, Adelaide için 2026 yaşam maliyeti"
                    : locale === "zh-Hans"
                      ? "悉尼、墨尔本、布里斯班、阿德莱德 2026 年生活成本"
                      : "2026 cost of living for Sydney, Melbourne, Brisbane, Adelaide"}
                </li>
              </ul>

              <div className="mt-auto pt-4">
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
                ? "Tahmini puanınızı ve potansiyel ek puan fırsatlarını gerçek göç kurallarına göre anında hesaplayın."
                : locale === "zh-Hans"
                ? "根据移民规则即刻计算您的预估分数以及潜在的加分机会。"
                : "Instantly calculate your estimated points and potential bonus point opportunities based on real immigration rules."}
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

    </section>
  );
}
