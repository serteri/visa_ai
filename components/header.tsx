"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, User, LayoutDashboard, LogOut, BookOpen } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

import { LanguageSelector } from "@/components/language-selector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

function portalLabel(role?: string | null) {
  if (role === "ADMIN") return "Admin Portal";
  if (role === "AGENT") return "Agent Portal";
  return "Account";
}

/** Minimalist user icon + dropdown replacing the old raw "Sign out"/avatar-letter UI. */
function UserMenu({ locale }: { locale: string }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  if (!session?.user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-white/10 dark:bg-transparent dark:text-slate-300"
      >
        <User className="h-3.5 w-3.5" />
        {portalLabel(session.user.role)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200/70 bg-white/95 py-1 shadow-xl backdrop-blur-lg dark:border-white/10 dark:bg-zinc-950/95"
        >
          <Link
            href={`/${locale}/dashboard`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              signOut({ callbackUrl: `/${locale}` });
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

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
  const pointsCalcLabel = isTr ? "Puan Hesapla (AUS)" : isZh ? "算分器 (AUS)" : "Points Calculator (AUS)";
  const englishPointsLabel = isTr ? "İngilizce Puanları" : isZh ? "英语分数" : "English Points";
  const guidesLabel = isTr ? "Rehberler" : isZh ? "指南" : "Guides";
  const invRoundsLabel = isTr ? "Davet Turları (AUS)" : isZh ? "邀请轮次 (AUS)" : "Invitation Rounds (AUS)";
  const occupationCodesLabel = "Occupation Codes (ANZSCO / NOC)";
  const skillsAssessLabel = isTr ? "Beceri Değerlendirme" : isZh ? "技能评估" : "Skills Assessment";
  const stateNominationLabel = isTr ? "Eyalet Nominasyonu" : isZh ? "州担保" : "State Nomination";
  const visaComparisonLabel = isTr ? "189-190-491 Karsilastirma" : isZh ? "189-190-491 对比" : "189 vs 190 vs 491";
  const toolsLabel = isTr ? "Araçlar" : isZh ? "工具" : "Tools";
  const resourcesLabel = isTr ? "Kaynaklar" : isZh ? "资源" : "Resources";
  const occupationListLabel = isTr ? "2026 Meslek Listesi" : isZh ? "2026 职业清单" : "2026 Occupation List";
  const contactLabel = isTr ? "İletişim" : isZh ? "联系我们" : "Contact";

  return (
    <header className="fixed inset-x-0 top-8 z-50">
      <div className="relative mx-auto w-[95%] max-w-7xl rounded-2xl border border-gray-200/50 bg-white/70 px-8 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/70">
        <nav className="flex items-center justify-between">
        <Link href={`/${locale}`} className="text-xl font-extrabold tracking-tight text-indigo-900 dark:text-white">
          Logi<span className="text-violet-600">Visa</span>
        </Link>

        {/* Desktop Navigation - Hidden on lg and below */}
        <div className="hidden lg:flex lg:items-center lg:gap-8">
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
            <div className="invisible absolute left-0 top-full z-50 mt-2 min-w-[280px] translate-y-2 rounded-xl border border-white/40 bg-white/95 p-2 shadow-xl backdrop-blur-lg opacity-0 transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 dark:border-white/10 dark:bg-black/95">
              <Link
                href={`/${locale}/visas/australia`}
                className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              >
                {isTr ? "Avustralya Vizeleri" : isZh ? "澳大利亚签证" : "Australia Visas"}
              </Link>
              <Link
                href={`/${locale}/visas/canada`}
                className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              >
                {isTr ? "Kanada Vizeleri" : isZh ? "加拿大签证" : "Canada Visas"}
              </Link>
            </div>
          </div>

          {/* Tools dropdown */}
          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white"
            >
              {toolsLabel}
              <svg className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="invisible absolute left-0 top-full z-50 mt-2 min-w-[220px] translate-y-2 rounded-xl border border-white/40 bg-white/90 p-2 shadow-xl backdrop-blur-lg opacity-0 transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 dark:border-white/10 dark:bg-black/90">
              <Link href={`/${locale}/tools/points-calculator`} className="block rounded-lg px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">
                {pointsCalcLabel}
              </Link>
              <Link href={`/${locale}/tools/english-points`} className="block rounded-lg px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">
                {englishPointsLabel}
              </Link>
              <Link href={`/${locale}/tools/invitation-rounds`} className="block rounded-lg px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">
                {invRoundsLabel}
              </Link>
              <Link href={`/${locale}/tools/skills-assessment`} className="block rounded-lg px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">
                {skillsAssessLabel}
              </Link>
              <Link href={`/${locale}/tools/anzsco-finder`} className="block rounded-lg px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">
                {occupationCodesLabel}
              </Link>
              {isTr && (
                <Link href={`/${locale}/rehber`} className="block rounded-lg px-4 py-2.5 text-sm font-semibold bg-orange-100 text-orange-700 transition-colors hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-100 dark:hover:bg-orange-800">
                  📥 Ücretsiz Rehber
                </Link>
              )}
              <Link href={`/${locale}/tools/document-checklist-2026`} className="block rounded-lg px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">
                {isTr ? "Belge Kontrol Listesi" : isZh ? "文件清单" : "Document Checklist"}
              </Link>
              <Link href={`/${locale}/occupation-checker`} className="block rounded-lg px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">
                {isTr ? "Meslek Kontrol" : isZh ? "职业检查" : "Occupation Checker"}
              </Link>
            </div>
          </div>

          {/* Resources dropdown */}
          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white"
            >
              {resourcesLabel}
              <svg className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="invisible absolute left-0 top-full z-50 mt-2 min-w-[220px] translate-y-2 rounded-xl border border-white/40 bg-white/95 p-2 shadow-xl backdrop-blur-lg opacity-0 transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 dark:border-white/10 dark:bg-black/95">
              <Link
                href={`/${locale}/resources/occupation-list`}
                className="flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <BookOpen className="h-4 w-4 shrink-0 text-indigo-400" />
                {occupationListLabel}
              </Link>
            </div>
          </div>

          <Link
            href={`/${locale}/guides`}
            className="whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white"
          >
            {guidesLabel}
          </Link>

          <Link
            href={`/${locale}/contact`}
            className="whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white"
          >
            {contactLabel}
          </Link>

          <Link
            href={`/${locale}/ai-visa-match`}
            className="whitespace-nowrap rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg"
          >
            AI Visa Match ⚡
          </Link>

          {showAdmin ? (
            <Link
              href={`/${locale}/admin/dashboard`}
              className="whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white"
            >
              {adminLabel}
            </Link>
          ) : null}

          <div className="ml-2 flex items-center gap-2 border-l border-slate-200 pl-6 dark:border-white/10">
            <ThemeToggle />
            <LanguageSelector currentLocale={locale} compact />

            {!isSignedIn ? (
              <>
                <Button
                  asChild
                  className="h-8 whitespace-nowrap rounded-full border-0 bg-gradient-to-r from-zinc-800 to-zinc-900 px-4 text-xs font-medium text-white shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md dark:from-zinc-100 dark:to-zinc-300 dark:text-zinc-900"
                >
                  <Link href={`/${locale}/full-check`}>{getReportLabel}</Link>
                </Button>
              </>
            ) : (
              <UserMenu locale={locale} />
            )}
          </div>
        </div>

        {/* Medium Screen Navigation (md to lg) - Show essential items only */}
        <div className="hidden md:flex lg:hidden md:items-center md:gap-2">
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
            <div className="invisible absolute left-0 top-full z-50 mt-2 min-w-[280px] translate-y-2 rounded-xl border border-white/40 bg-white/95 p-2 shadow-xl backdrop-blur-lg opacity-0 transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 dark:border-white/10 dark:bg-black/95">
              <Link
                href={`/${locale}/visas/australia`}
                className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              >
                {isTr ? "Avustralya Vizeleri" : isZh ? "澳大利亚签证" : "Australia Visas"}
              </Link>
              <Link
                href={`/${locale}/visas/canada`}
                className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              >
                {isTr ? "Kanada Vizeleri" : isZh ? "加拿大签证" : "Canada Visas"}
              </Link>
            </div>
          </div>

          {/* Tools dropdown */}
          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white"
            >
              {toolsLabel}
              <svg className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="invisible absolute left-0 top-full z-50 mt-2 min-w-[220px] translate-y-2 rounded-xl border border-white/40 bg-white/90 p-2 shadow-xl backdrop-blur-lg opacity-0 transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 dark:border-white/10 dark:bg-black/90">
              <Link href={`/${locale}/tools/points-calculator`} className="block rounded-lg px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">
                {pointsCalcLabel}
              </Link>
              <Link href={`/${locale}/tools/english-points`} className="block rounded-lg px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">
                {englishPointsLabel}
              </Link>
              <Link href={`/${locale}/tools/invitation-rounds`} className="block rounded-lg px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">
                {invRoundsLabel}
              </Link>
              <Link href={`/${locale}/tools/skills-assessment`} className="block rounded-lg px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">
                {skillsAssessLabel}
              </Link>
              <Link href={`/${locale}/tools/anzsco-finder`} className="block rounded-lg px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">
                {occupationCodesLabel}
              </Link>
              {isTr && (
                <Link href={`/${locale}/rehber`} className="block rounded-lg px-4 py-2.5 text-sm font-semibold bg-orange-100 text-orange-700 transition-colors hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-100 dark:hover:bg-orange-800">
                  📥 Ücretsiz Rehber
                </Link>
              )}
              <Link href={`/${locale}/tools/document-checklist-2026`} className="block rounded-lg px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">
                {isTr ? "Belge Kontrol Listesi" : isZh ? "文件清单" : "Document Checklist"}
              </Link>
              <Link href={`/${locale}/occupation-checker`} className="block rounded-lg px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">
                {isTr ? "Meslek Kontrol" : isZh ? "职业检查" : "Occupation Checker"}
              </Link>
            </div>
          </div>

          {/* Resources dropdown */}
          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white"
            >
              {resourcesLabel}
              <svg className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="invisible absolute left-0 top-full z-50 mt-2 min-w-[220px] translate-y-2 rounded-xl border border-white/40 bg-white/95 p-2 shadow-xl backdrop-blur-lg opacity-0 transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 dark:border-white/10 dark:bg-black/95">
              <Link
                href={`/${locale}/resources/occupation-list`}
                className="flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <BookOpen className="h-4 w-4 shrink-0 text-indigo-400" />
                {occupationListLabel}
              </Link>
            </div>
          </div>

          <Link
            href={`/${locale}/guides`}
            className="whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white"
          >
            {guidesLabel}
          </Link>

          <Link
            href={`/${locale}/contact`}
            className="whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white"
          >
            {contactLabel}
          </Link>

          <Link
            href={`/${locale}/ai-visa-match`}
            className="whitespace-nowrap rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg"
          >
            AI Visa Match ⚡
          </Link>

          <Button
            asChild
            className="h-8 whitespace-nowrap rounded-full border-0 bg-gradient-to-r from-zinc-800 to-zinc-900 px-3 text-xs font-medium text-white shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md dark:from-zinc-100 dark:to-zinc-300 dark:text-zinc-900"
          >
            <Link href={`/${locale}/full-check`}>{getReportLabel}</Link>
          </Button>

          <div className="ml-2 flex items-center gap-2 border-l border-slate-200 pl-2 dark:border-white/10">
            <ThemeToggle />
            <LanguageSelector currentLocale={locale} compact />
            <button
              type="button"
              className="text-slate-600 dark:text-slate-300"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Toggle (sm and below) */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
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
              <Link
                href={`/${locale}/visas/australia`}
                className="block rounded-lg px-2 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {isTr ? "Avustralya Vizeleri" : isZh ? "澳大利亚签证" : "Australia Visas"}
              </Link>
              <Link
                href={`/${locale}/visas/canada`}
                className="block rounded-lg px-2 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {isTr ? "Kanada Vizeleri" : isZh ? "加拿大签证" : "Canada Visas"}
              </Link>
            </div>

            <div className="h-px w-full bg-slate-100 dark:bg-white/10" />

            <Link
              href={`/${locale}/ai-visa-match`}
              className="block w-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-center text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              AI Visa Match ⚡
            </Link>

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
            <div className="space-y-1">
              <p className="px-2 text-xs font-semibold uppercase text-slate-400">{resourcesLabel}</p>
              <Link
                href={`/${locale}/resources/occupation-list`}
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <BookOpen className="h-4 w-4 text-indigo-400" />
                {occupationListLabel}
              </Link>
            </div>

            <div className="h-px w-full bg-slate-100 dark:bg-white/10" />

            <div className="space-y-1">
              <p className="px-2 text-xs font-semibold uppercase text-slate-400">{toolsLabel}</p>
              <Link href={`/${locale}/tools/points-calculator`} className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-500 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
                {pointsCalcLabel}
              </Link>
              <Link href={`/${locale}/tools/invitation-rounds`} className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-500 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
                {invRoundsLabel}
              </Link>
              <Link href={`/${locale}/tools/skills-assessment`} className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-500 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
                {skillsAssessLabel}
              </Link>
              <Link href={`/${locale}/tools/anzsco-finder`} className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-500 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
                {occupationCodesLabel}
              </Link>
              <Link href={`/${locale}/tools/document-checklist-2026`} className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-500 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
                {isTr ? "Belge Kontrol Listesi" : isZh ? "文件清单" : "Document Checklist"}
              </Link>
              <Link href={`/${locale}/occupation-checker`} className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-500 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
                {isTr ? "Meslek Kontrol" : isZh ? "职业检查" : "Occupation Checker"}
              </Link>
            </div>
            <Link
              href={`/${locale}/guides`}
              className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {guidesLabel}
            </Link>
            <Link
              href={`/${locale}/contact`}
              className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {contactLabel}
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
                </>
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 dark:border-white/10">
                  <Link
                    href={`/${locale}/dashboard`}
                    className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      signOut({ callbackUrl: `/${locale}` });
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
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
