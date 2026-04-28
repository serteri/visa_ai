"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { LanguageSelector } from "@/components/language-selector";

export function Header() {
  const params = useParams();
  const locale = params.locale as string;
  const checkerLabel = locale === "tr" ? "Kontrol" : "Checker";
  const assistantLabel = locale === "tr" ? "Asistan" : "Assistant";
  const fullReportLabel = locale === "tr" ? "Tam Rapor" : "Full Report";
  const adminLabel = "Admin";

  return (
    <header className="relative z-40 border-b border-border/40 bg-white/95 backdrop-blur-sm">
      <nav className="section-shell flex h-16 items-center justify-between">
        <Link href={`/${locale}`} className="text-lg font-semibold text-primary">
          Logivisa
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/checker`}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {checkerLabel}
          </Link>
          <Link
            href={`/${locale}/assistant`}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {assistantLabel}
          </Link>
          <Link
            href={`/${locale}/full-check`}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {fullReportLabel}
          </Link>
          <Link
            href={`/${locale}/admin/dashboard`}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {adminLabel}
          </Link>
          <LanguageSelector currentLocale={locale} />
        </div>
      </nav>
    </header>
  );
}
