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
    </footer>
  );
}
