"use client";

import Link from "next/link";

import { useLanguage, useTranslation } from "@/contexts/language-context";

export function GlobalDisclaimerFooter() {
  const { t } = useTranslation();
  const { language } = useLanguage();

  return (
    <footer className="border-t border-border/70 bg-background/95 px-4 py-4 text-center text-xs text-muted-foreground">
      <p>{t("footer.generalInfo")}</p>
      <Link
        href={`/${language}/contact`}
        className="mt-1 inline-block font-medium text-foreground/70 underline underline-offset-2 hover:text-foreground"
      >
        {t("footer.contact")}
      </Link>

      {/* Official Resources — permanent link to the official occupation list PDF */}
      <div className="mt-3 border-t border-border/50 pt-3">
        <p className="font-semibold uppercase tracking-wide text-foreground/60">
          {t("footer.officialResources")}
        </p>
        <a
          href="/australia-skilled-occupation-list-2026.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block font-medium text-foreground/70 underline underline-offset-2 hover:text-foreground"
        >
          {t("footer.officialListPdf")}
        </a>
      </div>
    </footer>
  );
}
