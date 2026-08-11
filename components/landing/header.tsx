"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";

import { LanguageSelector } from "@/components/language-selector";
import { ThemeToggle } from "@/components/ThemeToggle";

interface LandingHeaderProps {
  locale: string;
}

function DropdownMenu({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-[var(--cf-muted)] transition-colors hover:text-[var(--cf-accent)]"
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[220px] rounded-xl border border-[var(--cf-cover-line)] bg-[var(--cf-cover-bg)]/95 p-2 shadow-xl backdrop-blur-lg">
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownLink({ href, locale, children }: { href: string; locale: string; children: React.ReactNode }) {
  return (
    <Link
      href={`/${locale}${href}`}
      className="block rounded-lg px-4 py-2.5 text-sm text-[var(--cf-cover-muted)] transition-colors hover:bg-[var(--cf-accent-dim)] hover:text-[var(--cf-cover-fg)]"
    >
      {children}
    </Link>
  );
}

export function LandingHeader({ locale }: LandingHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const tx = (tr: string, en: string, zh: string) => (isTr ? tr : isZh ? zh : en);

  return (
    <header className="fixed top-4 left-0 right-0 z-50 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl rounded-2xl border border-[var(--cf-line)] bg-[var(--cf-bg)]/80 px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-md sm:px-6">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <Link href={`/${locale}`} className="text-lg font-extrabold tracking-tight text-[var(--cf-fg)]">
            Logi<span className="text-[var(--cf-accent)]">Visa</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-6 lg:flex">
            <DropdownMenu label={tx("Vizeler", "Visas", "签证")}>
              <DropdownLink href="/visas/australia" locale={locale}>{tx("Avustralya Vizeleri", "Australia Visas", "澳大利亚签证")}</DropdownLink>
              <DropdownLink href="/visas/canada" locale={locale}>{tx("Kanada Vizeleri", "Canada Visas", "加拿大签证")}</DropdownLink>
            </DropdownMenu>

            <DropdownMenu label={tx("Araçlar", "Tools", "工具")}>
              <DropdownLink href="/tools/anzsco-finder" locale={locale}>{tx("Meslek Ara", "Occupation Search", "职业搜索")}</DropdownLink>
              <DropdownLink href="/tools/points-calculator" locale={locale}>{tx("Puan Hesapla (AUS)", "Points Calculator (AUS)", "积分计算器")}</DropdownLink>
              <DropdownLink href="/tools/skills-assessment" locale={locale}>{tx("Beceri Değerlendirme", "Skills Assessment", "技能评估")}</DropdownLink>
              <DropdownLink href="/ai-visa-match" locale={locale}>AI Visa Match ⚡</DropdownLink>
            </DropdownMenu>

            <DropdownMenu label={tx("Kaynaklar", "Resources", "资源")}>
              <DropdownLink href="/guides" locale={locale}>{tx("Rehberler", "Guides", "指南")}</DropdownLink>
              <DropdownLink href="/tools/document-checklist-2026" locale={locale}>{tx("Belge Kontrol Listesi", "Document Checklist", "文件清单")}</DropdownLink>
              <DropdownLink href="/contact" locale={locale}>{tx("İletişim", "Contact", "联系我们")}</DropdownLink>
            </DropdownMenu>
          </div>

          {/* Right side: Theme, Language, CTA */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <LanguageSelector currentLocale={locale} compact />
            <div className="hidden h-6 w-px bg-[var(--cf-line)] sm:block" />
            <Link
              href={`/${locale}/full-check`}
              className="hidden whitespace-nowrap rounded-full bg-[var(--cf-accent)] px-4 py-2 text-sm font-semibold text-[var(--cf-bg-deep)] shadow-sm transition-all hover:opacity-90 hover:shadow-md sm:inline-flex"
            >
              {tx("Değerlendirme Başlat", "Start Assessment", "开始评估")}
            </Link>

            {/* Mobile hamburger */}
            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((v) => !v)}
              className="text-[var(--cf-muted)] lg:hidden"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="mt-3 border-t border-[var(--cf-line)] pt-3 lg:hidden">
            <div className="flex flex-col gap-1">
              <Link href={`/${locale}/visas/australia`} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--cf-muted)] hover:bg-[var(--cf-accent-dim)] hover:text-[var(--cf-accent)]">{tx("Avustralya Vizeleri", "Australia Visas", "澳大利亚签证")}</Link>
              <Link href={`/${locale}/visas/canada`} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--cf-muted)] hover:bg-[var(--cf-accent-dim)] hover:text-[var(--cf-accent)]">{tx("Kanada Vizeleri", "Canada Visas", "加拿大签证")}</Link>
              <div className="my-1 h-px bg-[var(--cf-line)]" />
              <Link href={`/${locale}/tools/anzsco-finder`} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--cf-muted)] hover:bg-[var(--cf-accent-dim)] hover:text-[var(--cf-accent)]">{tx("Meslek Ara", "Occupation Search", "职业搜索")}</Link>
              <Link href={`/${locale}/tools/points-calculator`} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--cf-muted)] hover:bg-[var(--cf-accent-dim)] hover:text-[var(--cf-accent)]">{tx("Puan Hesapla", "Points Calculator", "积分计算器")}</Link>
              <Link href={`/${locale}/tools/skills-assessment`} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--cf-muted)] hover:bg-[var(--cf-accent-dim)] hover:text-[var(--cf-accent)]">{tx("Beceri Değerlendirme", "Skills Assessment", "技能评估")}</Link>
              <Link href={`/${locale}/ai-visa-match`} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[var(--cf-accent)]">AI Visa Match ⚡</Link>
              <div className="my-1 h-px bg-[var(--cf-line)]" />
              <Link href={`/${locale}/guides`} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--cf-muted)] hover:bg-[var(--cf-accent-dim)] hover:text-[var(--cf-accent)]">{tx("Rehberler", "Guides", "指南")}</Link>
              <Link href={`/${locale}/tools/document-checklist-2026`} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--cf-muted)] hover:bg-[var(--cf-accent-dim)] hover:text-[var(--cf-accent)]">{tx("Belge Kontrol", "Document Checklist", "文件清单")}</Link>
              <Link href={`/${locale}/contact`} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--cf-muted)] hover:bg-[var(--cf-accent-dim)] hover:text-[var(--cf-accent)]">{tx("İletişim", "Contact", "联系我们")}</Link>
              <div className="my-1 h-px bg-[var(--cf-line)]" />
              <Link href={`/${locale}/full-check`} onClick={() => setMobileOpen(false)} className="mt-1 rounded-full bg-[var(--cf-accent)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--cf-bg-deep)]">
                {tx("Değerlendirme Başlat", "Start Assessment", "开始评估")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
