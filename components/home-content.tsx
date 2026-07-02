"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
