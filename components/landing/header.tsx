"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { LanguageSelector } from "@/components/language-selector";
import { ThemeToggle } from "@/components/ThemeToggle";

interface LandingHeaderProps {
  locale: string;
}

/**
 * Minimalist landing navbar. The homepage is the only route that renders its
 * own header/footer — `ShellHeaderGate`/`ShellFooterGate` in the (main) layout
 * suppress the global site chrome there. `-mt-28 sm:-mt-32` cancels the
 * layout's top padding so this bar sits flush at the top and sticks on scroll.
 */
export function LandingHeader({ locale }: LandingHeaderProps) {
  const [open, setOpen] = useState(false);
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  const links = [
    {
      href: `/${locale}/tools/anzsco-finder`,
      label: isTr ? "Meslek Ara" : isZh ? "职业搜索" : "Occupation Search",
    },
    {
      href: `/${locale}/tools/points-calculator`,
      label: isTr ? "Puan Hesapla" : isZh ? "积分计算器" : "Points Calculator",
    },
    {
      href: `/${locale}/tools/skills-assessment`,
      label: isTr ? "Beceri Değerlendirme" : isZh ? "技能评估" : "Skills Assessment",
    },
    {
      href: `/${locale}/guides`,
      label: isTr ? "Rehberler" : isZh ? "指南" : "Guides",
    },
  ];

  const ctaLabel = isTr ? "Ücretsiz Rapor Al" : isZh ? "获取免费报告" : "Get Free Report";

  return (
    <header className="sticky top-0 z-50 -mt-28 border-b border-[var(--cf-line)] bg-[var(--cf-bg)]/85 backdrop-blur-md sm:-mt-32">
      <div className="section-shell flex h-16 items-center justify-between">
        <Link
          href={`/${locale}`}
          className="text-lg font-extrabold tracking-tight text-[var(--cf-fg)]"
        >
          Logi<span className="text-[var(--cf-accent)]">Visa</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-sm font-medium text-[var(--cf-muted)] transition-colors hover:text-[var(--cf-accent)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <LanguageSelector currentLocale={locale} compact />

          <Link
            href={`/${locale}/full-check`}
            className="hidden whitespace-nowrap rounded-full bg-[var(--cf-accent)] px-4 py-2 text-sm font-semibold text-[var(--cf-bg-deep)] transition-all hover:opacity-90 hover:shadow-lg sm:inline-flex"
          >
            {ctaLabel}
          </Link>

          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="text-[var(--cf-muted)] md:hidden"
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-[var(--cf-line)] bg-[var(--cf-bg)]/95 px-4 py-4 backdrop-blur-md md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--cf-muted)] transition-colors hover:bg-[var(--cf-accent-dim)] hover:text-[var(--cf-accent)]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={`/${locale}/full-check`}
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-[var(--cf-accent)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--cf-bg-deep)]"
            >
              {ctaLabel}
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
