"use client";

import Link from "next/link";
import { LanguageSelector } from "@/components/language-selector";

export function Header() {
  return (
    <header className="border-b border-border/40 bg-white/95 backdrop-blur-sm">
      <nav className="section-shell flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-primary">
          VisaAI
        </Link>

        <div className="flex items-center gap-4">
          <LanguageSelector />
        </div>
      </nav>
    </header>
  );
}
