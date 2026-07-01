"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/contexts/language-context";
import { PdfDownloadModal } from "@/components/PdfDownloadModal";
import { activeCountries, countryComplianceBadge } from "@/lib/countries";



export function HomeContent() {
  const params = useParams();
  const locale = params.locale as string;
  const { t } = useTranslation();
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

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
            <span className="block">Logi<span className="text-violet-600">Visa</span></span>
            <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
              {locale === "tr" ? "Vize Yol Haritanız" : locale === "zh-Hans" ? "您的签证路线图" : "Your Visa Roadmap"}
            </span>
          </h1>
          
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400 sm:text-xl">
            {t("hero.subheadline")}
          </p>
          
          {/* Country Selector Cards */}
          <div className="mt-10 flex w-full max-w-2xl flex-col gap-4 sm:flex-row sm:justify-center">
            {/* Australia Card */}
            <Link
              href={`/${locale}/full-check?country=AU`}
              className="group relative flex flex-1 flex-col items-center gap-3 rounded-2xl border-2 border-indigo-200 bg-white/80 px-6 py-5 shadow-md backdrop-blur-sm transition-all duration-300 hover:border-indigo-400 hover:shadow-indigo-200/60 hover:shadow-xl hover:scale-105 dark:border-indigo-800/60 dark:bg-zinc-900/70 dark:hover:border-indigo-600"
            >
              <span className="text-4xl">🇦🇺</span>
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
                  {locale === "tr" ? "Ülke" : locale === "zh-Hans" ? "目的地" : "Destination"}
                </p>
                <p className="mt-0.5 text-lg font-extrabold text-slate-900 dark:text-white">
                  {locale === "tr" ? "Avustralya" : locale === "zh-Hans" ? "澳大利亚" : "Australia"}
                </p>
              </div>
              <span className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-2.5 text-center text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all group-hover:shadow-indigo-500/50">
                {locale === "tr" ? "Rapor Al →" : locale === "zh-Hans" ? "获取报告 →" : "Get My Report →"}
              </span>
            </Link>

            {/* Canada Card */}
            <Link
              href={`/${locale}/full-check?country=CA`}
              className="group relative flex flex-1 flex-col items-center gap-3 rounded-2xl border-2 border-red-200 bg-white/80 px-6 py-5 shadow-md backdrop-blur-sm transition-all duration-300 hover:border-red-400 hover:shadow-red-200/60 hover:shadow-xl hover:scale-105 dark:border-red-800/60 dark:bg-zinc-900/70 dark:hover:border-red-600"
            >
              <span className="absolute -top-3 right-4 rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                {locale === "tr" ? "YENİ" : locale === "zh-Hans" ? "新" : "NEW"}
              </span>
              <span className="text-4xl">🇨🇦</span>
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-red-500 dark:text-red-400">
                  {locale === "tr" ? "Ülke" : locale === "zh-Hans" ? "目的地" : "Destination"}
                </p>
                <p className="mt-0.5 text-lg font-extrabold text-slate-900 dark:text-white">
                  {locale === "tr" ? "Kanada" : locale === "zh-Hans" ? "加拿大" : "Canada"}
                </p>
              </div>
              <span className="w-full rounded-xl bg-gradient-to-r from-red-500 to-rose-600 py-2.5 text-center text-sm font-bold text-white shadow-lg shadow-red-500/30 transition-all group-hover:shadow-red-500/50">
                {locale === "tr" ? "Rapor Al →" : locale === "zh-Hans" ? "获取报告 →" : "Get My Report →"}
              </span>
            </Link>
          </div>

          {/* Secondary micro-tool CTA */}
          <p className="mt-5 text-sm text-slate-400">
            <Link
              href={`/${locale}/tools/points-calculator`}
              className="inline-flex items-center gap-1 font-medium text-indigo-500 transition-colors hover:text-indigo-700"
            >
              {locale === "tr"
                ? "Ücretsiz Puan Hesaplayıcıyı Dene"
                : locale === "zh-Hans"
                  ? "试用免费算分器"
                  : "Try Free Points Calculator"}{" "}
              ➔
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

      {/* PDF Download Banner */}
      <section className="section-shell">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-700 px-8 py-10 text-white shadow-xl">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-purple-400/20 blur-2xl pointer-events-none" />

          <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-3xl">📘</span>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                  Turkish PDF · 2026
                </span>
              </div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">
                {locale === "tr"
                  ? "PR Rehberi 2026 — AU & CA"
                  : locale === "zh-Hans"
                    ? "PR 指南 2026 — 澳大利亚 & 加拿大"
                    : "PR Guide 2026 — AU & CA"}
              </h2>
              <p className="max-w-lg text-indigo-100 text-sm sm:text-base">
                {locale === "tr" ? (
                  <>
                    Avustralya ve Kanada kalıcı oturma izni süreçlerini adım adım anlatan
                    ücretsiz Türkçe rehberimizi indirin. İlk 20 indirme <strong>bedava</strong>, sonrası <strong>$20</strong>.
                  </>
                ) : locale === "zh-Hans" ? (
                  <>
                    下载这份免费的土耳其语指南，逐步了解澳大利亚和加拿大的永久居留申请流程。前 20 次下载
                    <strong>免费</strong>，之后 <strong>$20</strong>。
                  </>
                ) : (
                  <>
                    Download our free Turkish guide covering the permanent residency process
                    for both Australia and Canada, step by step. First 20 downloads are
                    <strong> free</strong>, then <strong>$20</strong>.
                  </>
                )}
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => setPdfModalOpen(true)}
              className="shrink-0 bg-white text-indigo-700 font-bold hover:bg-indigo-50 border-0 shadow-lg"
            >
              {locale === "tr"
                ? "📥 Ücretsiz İndir"
                : locale === "zh-Hans"
                  ? "📥 免费下载"
                  : "📥 Free Download"}
            </Button>
          </div>
        </div>
      </section>

      <PdfDownloadModal
        locale={locale}
        open={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
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
