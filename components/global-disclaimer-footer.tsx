"use client";

import { useState } from "react";
import Link from "next/link";

import { useLanguage, useTranslation } from "@/contexts/language-context";
import { PdfDownloadModal } from "@/components/PdfDownloadModal";

export function GlobalDisclaimerFooter() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  return (
    <footer className="border-t border-border/70 bg-background/95 px-4 py-4 text-center text-xs text-muted-foreground">
      <p>{t("footer.generalInfo")}</p>
      <Link
        href={`/${language}/contact`}
        className="mt-1 inline-block font-medium text-foreground/70 underline underline-offset-2 hover:text-foreground"
      >
        {t("footer.contact")}
      </Link>

      {/* Official Resources — opens the lead-capture modal; the PDF is
          emailed after the form is submitted, not linked directly. */}
      <div className="mt-3 border-t border-border/50 pt-3">
        <p className="font-semibold uppercase tracking-wide text-foreground/60">
          {t("footer.officialResources")}
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPdfModalOpen(true);
          }}
          className="mt-1 inline-block font-medium text-foreground/70 underline underline-offset-2 hover:text-foreground"
        >
          {t("footer.officialListPdf")}
        </button>
      </div>

      <PdfDownloadModal
        locale={language}
        product="occupation"
        open={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
      />
    </footer>
  );
}
