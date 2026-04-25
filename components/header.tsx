"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { LanguageSelector } from "@/components/language-selector";

export function Header() {
  const params = useParams();
  const locale = params.locale as string;
  const pointsLabel = locale === "tr" ? "Puan Hesaplayıcı" : "Points Calculator";
  const occupationLabel = locale === "tr" ? "Meslek Kontrol" : "Occupation Checker";
  const assistantLabel = locale === "tr" ? "AI Asistan" : "AI Assistant";

  return (
    <header className="relative z-40 border-b border-border/40 bg-white/95 backdrop-blur-sm">
      <nav className="section-shell flex h-16 items-center justify-between">
        <Link href={`/${locale}`} className="text-lg font-semibold text-primary">
          VisaAI
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/occupation-checker`}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {occupationLabel}
          </Link>
          <Link
            href={`/${locale}/points-calculator`}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {pointsLabel}
          </Link>
          <Link
            href={`/${locale}/assistant`}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {assistantLabel}
          </Link>
          <LanguageSelector currentLocale={locale} />
        </div>
      </nav>
    </header>
  );
}
