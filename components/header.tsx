"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

import { LanguageSelector } from "@/components/language-selector";
import { Button } from "@/components/ui/button";

const VISA_LINKS = [
  { subclass: "500", en: "Student visa 500", tr: "Öğrenci Vizesi 500", zh: "500 学生签证" },
  { subclass: "485", en: "Temporary Graduate visa 485", tr: "Geçici Mezun Vizesi 485", zh: "485 临时毕业生签证" },
  { subclass: "482", en: "Skills in Demand visa 482", tr: "Skills in Demand Vizesi 482", zh: "482 紧缺技能签证" },
  { subclass: "189", en: "Skilled Independent visa 189", tr: "Skilled Independent Vizesi 189", zh: "189 独立技术移民" },
  { subclass: "190", en: "Skilled Nominated visa 190", tr: "Skilled Nominated Vizesi 190", zh: "190 州担保技术移民" },
  { subclass: "491", en: "Skilled Work Regional visa 491", tr: "Skilled Work Regional Vizesi 491", zh: "491 偏远地区技术签证" },
  { subclass: "820_801", en: "Partner visa 820/801", tr: "Partner Vizesi 820/801", zh: "820/801 配偶签证" },
];

export function Header({
  locale,
  showAdmin = false,
}: {
  locale: string;
  showAdmin?: boolean;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;

  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const checkerLabel = isTr ? "Kontrol" : isZh ? "评估" : "Checker";
  const assistantLabel = isTr ? "Asistan" : isZh ? "助手" : "Assistant";
  const fullReportLabel = isTr ? "Tam Rapor" : isZh ? "完整报告" : "Full Report";
  const visasLabel = isTr ? "Vizeler" : isZh ? "签证" : "Visas";
  const adminLabel = "Admin";
  const getReportLabel = isTr ? "Ücretsiz Rapor Al" : isZh ? "获取免费报告" : "Get Free Report";
  const pointsCalcLabel = isTr ? "Puan Hesapla" : isZh ? "算分器" : "Points Calculator";
  const guidesLabel = isTr ? "Rehberler" : isZh ? "指南" : "Guides";
  const invRoundsLabel = isTr ? "Davet Turları" : isZh ? "邀请轮次" : "Invitation Rounds";

  return (
    <header className="fixed inset-x-0 top-8 z-50">
      <div className="relative mx-auto w-[95%] max-w-7xl rounded-2xl border border-gray-200/50 bg-white/70 px-8 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/70">
        <nav className="flex items-center justify-between">
        <Link href={`/${locale}`} className="text-xl font-extrabold tracking-tight text-indigo-900 dark:text-white">
          Logi<span className="text-violet-600">Visa</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:gap-6 lg:gap-8">
          {/* Visas dropdown */}
          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white"
            >
              {visasLabel}
              <svg
                className="h-3.5 w-3.5 transition-transform group-hover:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="invisible absolute left-0 top-full z-50 mt-2 min-w-[240px] translate-y-2 rounded-xl border border-white/40 bg-white/90 p-2 shadow-xl backdrop-blur-lg opacity-0 transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 dark:border-white/10 dark:bg-black/90">
              {VISA_LINKS.map((v) => (
                <Link
                  key={v.subclass}
                  href={`/${locale}/visas/${v.subclass}`}
                  className="block rounded-lg px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  {isTr ? v.tr : isZh ? v.zh : v.en}
                </Link>
              ))}
            </div>
          </div>

          <Link
            href={`/${locale}/checker`}
            className="whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white"
          >
            {checkerLabel}
          </Link>
          <Link
            href={`/${locale}/assistant`}
            className="whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white"
          >
            {assistantLabel}
          </Link>
          <Link
            href={`/${locale}/tools/points-calculator`}
            className="whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-indigo-500 dark:text-slate-300 dark:hover:text-white"
          >
            {pointsCalcLabel}
          </Link>
          <Link
            href={`/${locale}/tools/invitation-rounds`}
            className="whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-indigo-500 dark:text-slate-300 dark:hover:text-white"
          >
            {invRoundsLabel}
          </Link>
          <Link
            href={`/${locale}/guides`}
            className="whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white"
          >
            {guidesLabel}
          </Link>
          <Link
            href={`/${locale}/full-check`}
            className="whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white"
          >
            {fullReportLabel}
          </Link>
          {showAdmin ? (
            <Link
              href={`/${locale}/admin/dashboard`}
              className="whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white"
            >
              {adminLabel}
            </Link>
          ) : null}

          <div className="ml-2 flex items-center gap-3 border-l border-slate-200 pl-6 dark:border-white/10">
            <LanguageSelector currentLocale={locale} compact />

            {!isSignedIn ? (
              <>
                <Button
                  asChild
                  variant="ghost"
                  className="h-8 whitespace-nowrap rounded-full px-4 text-xs font-medium text-slate-600 hover:text-indigo-600"
                >
                  <Link href={`/${locale}/sign-in`}>Sign In</Link>
                </Button>
                <Button
                  asChild
                  className="h-8 whitespace-nowrap rounded-full border-0 bg-gradient-to-r from-zinc-800 to-zinc-900 px-4 text-xs font-medium text-white shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md dark:from-zinc-100 dark:to-zinc-300 dark:text-zinc-900"
                >
                  <Link href={`/${locale}/full-check`}>{getReportLabel}</Link>
                </Button>
              </>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  className="h-8 whitespace-nowrap rounded-full px-4 text-xs font-medium text-slate-600 hover:text-indigo-600"
                >
                  <Link href={`/${locale}/dashboard`}>Dashboard</Link>
                </Button>
                {session.user?.image ? (
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: `/${locale}` })}
                    className="h-8 w-8 overflow-hidden rounded-full ring-2 ring-slate-200 hover:ring-indigo-400 transition-all"
                    title="Sign out"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={session.user.image} alt="" className="h-full w-full object-cover" />
                  </button>
                ) : (
                  <Button
                    variant="ghost"
                    className="h-8 whitespace-nowrap rounded-full px-4 text-xs font-medium text-slate-600 hover:text-rose-500"
                    onClick={() => signOut({ callbackUrl: `/${locale}` })}
                  >
                    Sign out
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex items-center gap-4 md:hidden">
          <LanguageSelector currentLocale={locale} />
          <button
            type="button"
            className="text-slate-600 dark:text-slate-300"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Panel */}
      {isMobileMenuOpen && (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] w-full rounded-3xl border border-white/20 bg-white/95 px-6 py-4 shadow-2xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95 md:hidden">
          <div className="flex flex-col space-y-4">
            <div className="space-y-1">
              <p className="px-2 text-xs font-semibold uppercase text-slate-400">{visasLabel}</p>
              {VISA_LINKS.map((v) => (
                <Link
                  key={v.subclass}
                  href={`/${locale}/visas/${v.subclass}`}
                  className="block rounded-lg px-2 py-2 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {isTr ? v.tr : isZh ? v.zh : v.en}
                </Link>
              ))}
            </div>

            <div className="h-px w-full bg-slate-100 dark:bg-white/10" />

            <Link
              href={`/${locale}/checker`}
              className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {checkerLabel}
            </Link>
            <Link
              href={`/${locale}/assistant`}
              className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {assistantLabel}
            </Link>
            <Link
              href={`/${locale}/tools/points-calculator`}
              className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-500 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {pointsCalcLabel}
            </Link>
            <Link
              href={`/${locale}/tools/invitation-rounds`}
              className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-500 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {invRoundsLabel}
            </Link>
            <Link
              href={`/${locale}/guides`}
              className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {guidesLabel}
            </Link>
            <Link
              href={`/${locale}/full-check`}
              className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {fullReportLabel}
            </Link>
            {showAdmin ? (
              <Link
                href={`/${locale}/admin/dashboard`}
                className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {adminLabel}
              </Link>
            ) : null}

            <div className="pt-2 space-y-2">
              {!isSignedIn ? (
                <>
                  <Button
                    asChild
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30"
                  >
                    <Link href={`/${locale}/full-check`} onClick={() => setIsMobileMenuOpen(false)}>
                      {getReportLabel}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/${locale}/sign-in`} onClick={() => setIsMobileMenuOpen(false)}>
                      Sign In
                    </Link>
                  </Button>
                </>
              ) : (
                <div className="flex items-center justify-between px-2">
                  <Link
                    href={`/${locale}/dashboard`}
                    className="text-sm font-medium text-slate-700 hover:text-indigo-600"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      signOut({ callbackUrl: `/${locale}` });
                    }}
                    className="text-xs font-medium text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </header>
  );
}
