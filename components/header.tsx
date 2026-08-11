"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown, User, LayoutDashboard, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

import { LanguageSelector } from "@/components/language-selector";
import { ThemeToggle } from "@/components/ThemeToggle";

// ── Dropdown Menu Component ─────────────────────────────────────────────────
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

function DropdownLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block rounded-lg px-4 py-2.5 text-sm text-[var(--cf-cover-muted)] transition-colors hover:bg-[var(--cf-accent-dim)] hover:text-[var(--cf-cover-fg)]">
      {children}
    </Link>
  );
}

// ── User Menu ────────────────────────────────────────────────────────────────
function UserMenu({ locale }: { locale: string }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!session?.user) return null;

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--cf-line)] px-3 text-xs font-medium text-[var(--cf-muted)] transition-colors hover:border-[var(--cf-accent-dim)] hover:text-[var(--cf-accent)]">
        <User className="h-3.5 w-3.5" />
        {session.user.role === "ADMIN" ? "Admin" : "Account"}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-[var(--cf-line)] bg-[var(--cf-cover-bg)]/95 py-1 shadow-xl backdrop-blur-lg">
          <Link href={`/${locale}/dashboard`} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--cf-cover-muted)] hover:bg-[var(--cf-accent-dim)] hover:text-[var(--cf-cover-fg)]">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); signOut({ callbackUrl: `/${locale}` }); }} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[var(--cf-cover-muted)] hover:bg-red-50 hover:text-red-600">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Header ──────────────────────────────────────────────────────────────
export function Header({ locale, showAdmin = false }: { locale: string; showAdmin?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;
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
            {/* Visas Dropdown */}
            <DropdownMenu label={tx("Vizeler", "Visas", "签证")}>
              <DropdownLink href={`/${locale}/visas/australia`}>{tx("Avustralya Vizeleri", "Australia Visas", "澳大利亚签证")}</DropdownLink>
              <DropdownLink href={`/${locale}/visas/canada`}>{tx("Kanada Vizeleri", "Canada Visas", "加拿大签证")}</DropdownLink>
            </DropdownMenu>

            {/* Tools Dropdown */}
            <DropdownMenu label={tx("Araçlar", "Tools", "工具")}>
              <DropdownLink href={`/${locale}/tools/anzsco-finder`}>{tx("Meslek Ara", "Occupation Search", "职业搜索")}</DropdownLink>
              <DropdownLink href={`/${locale}/tools/points-calculator`}>{tx("Puan Hesapla (AUS)", "Points Calculator", "积分计算器")}</DropdownLink>
              <DropdownLink href={`/${locale}/tools/skills-assessment`}>{tx("Beceri Değerlendirme", "Skills Assessment", "技能评估")}</DropdownLink>
              <DropdownLink href={`/${locale}/ai-visa-match`}>AI Visa Match ⚡</DropdownLink>
            </DropdownMenu>

            {/* Resources Dropdown */}
            <DropdownMenu label={tx("Kaynaklar", "Resources", "资源")}>
              <DropdownLink href={`/${locale}/guides`}>{tx("Rehberler", "Guides", "指南")}</DropdownLink>
              <DropdownLink href={`/${locale}/tools/document-checklist-2026`}>{tx("Belge Kontrol", "Document Checklist", "文件清单")}</DropdownLink>
              <DropdownLink href={`/${locale}/contact`}>{tx("İletişim", "Contact", "联系我们")}</DropdownLink>
            </DropdownMenu>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <LanguageSelector currentLocale={locale} compact />
            <div className="hidden h-6 w-px bg-[var(--cf-line)] sm:block" />

            {isSignedIn ? (
              <UserMenu locale={locale} />
            ) : (
              <Link href={`/${locale}/full-check`} className="hidden whitespace-nowrap rounded-full bg-[var(--cf-accent)] px-4 py-2 text-sm font-semibold text-[var(--cf-bg-deep)] shadow-sm transition-all hover:opacity-90 hover:shadow-md sm:inline-flex">
                {tx("Değerlendirme Başlat", "Start Assessment", "开始评估")}
              </Link>
            )}

            {/* Mobile hamburger */}
            <button type="button" aria-label={mobileOpen ? "Close" : "Menu"} onClick={() => setMobileOpen((v) => !v)} className="text-[var(--cf-muted)] lg:hidden">
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
