"use client";

import { useState, type MouseEvent } from "react";
import { useParams } from "next/navigation";
import { PdfDownloadModal, type PdfProduct } from "@/components/PdfDownloadModal";
import { LandingHeader } from "@/components/landing/header";
import { Hero } from "@/components/landing/Hero";
import { InstitutionsMarquee } from "@/components/landing/institutions-marquee";
import { StatsBar } from "@/components/landing/StatsBar";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CaseLog } from "@/components/landing/CaseLog";
import { PdfGuides } from "@/components/landing/PdfGuides";
import { FeaturesBento } from "@/components/landing/FeaturesBento";
import { Faq } from "@/components/landing/Faq";
import { Testimonials } from "@/components/landing/Testimonials";
import { LandingFooter } from "@/components/landing/footer";

const FREE_DOWNLOADS_FALLBACK = 18;
const ASSESSMENT_SLOTS_FALLBACK = 14;

interface HomeContentProps {
  /**
   * Server-computed free-download count (see app/[locale]/(main)/page.tsx),
   * used to seed state so the initial client render already matches the
   * server-rendered HTML. Re-fetching this on the client after mount was
   * what caused the old 18 -> 17 flicker; there is deliberately no client-side
   * refetch here anymore — a fresh value only requires reloading the page,
   * which already happens naturally on next navigation since the value is
   * revalidated server-side every 60s (see getCachedPdfLeadDownloadStats).
   */
  initialFreeDownloadsLeft?: number;
  /**
   * Marketing "urgency" counter for the hero scarcity banner — computed
   * server-side (see app/[locale]/(main)/page.tsx) from the real backend
   * quota, but intentionally not the raw remaining-spots number itself.
   * Starts at 14 and decreases by 1 per real submission, floored at 2. Same
   * seed-once pattern as initialFreeDownloadsLeft — avoids the hydration flicker.
   */
  initialAssessmentSlotsLeft?: number;
}

/**
 * Landing page composition root — "case file" visual redesign (see
 * design/logivisa_landing_redesign.html for the reference mockup and
 * app/globals.css's .case-file block for the theme tokens). All section
 * content/logic lives in components/landing/*; this file only owns the
 * state that's shared across sections (free-download counter, PDF modal).
 */
export function HomeContent({ initialFreeDownloadsLeft, initialAssessmentSlotsLeft }: HomeContentProps) {
  const params = useParams();
  const locale = params.locale as string;

  function handleScrollToPdfSection(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const section = document.getElementById("pdf-download-section");
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Shared free-download counter — drives the CTA copy on BOTH product cards below.
  const [freeDownloadsLeft] = useState(initialFreeDownloadsLeft ?? FREE_DOWNLOADS_FALLBACK);
  const [assessmentSlotsLeft] = useState(initialAssessmentSlotsLeft ?? ASSESSMENT_SLOTS_FALLBACK);
  const [activePdfModal, setActivePdfModal] = useState<PdfProduct | null>(null);

  const hasFreeSlots = freeDownloadsLeft > 0;
  const hasFreeAssessmentSlots = assessmentSlotsLeft > 0;

  return (
    <div className="case-file">
      <LandingHeader locale={locale} />
      <Hero
        locale={locale}
        assessmentSlotsLeft={assessmentSlotsLeft}
        hasFreeAssessmentSlots={hasFreeAssessmentSlots}
        onScrollToPdfSection={handleScrollToPdfSection}
      />
      <InstitutionsMarquee locale={locale} />
      <StatsBar locale={locale} />
      <HowItWorks locale={locale} />
      <CaseLog locale={locale} />
      <PdfGuides
        locale={locale}
        hasFreeSlots={hasFreeSlots}
        freeDownloadsLeft={freeDownloadsLeft}
        setActivePdfModal={setActivePdfModal}
      />
      <PdfDownloadModal
        locale={locale}
        product={activePdfModal ?? "turkish"}
        open={activePdfModal !== null}
        onClose={() => setActivePdfModal(null)}
      />
      <FeaturesBento locale={locale} />
      <Faq locale={locale} />
      <Testimonials locale={locale} />
      {/* Closing CTA + footer: the homepage carries its own (see
          components/landing/footer.tsx); the layout's global PreFooterCta /
          GlobalDisclaimerFooter are suppressed here by ShellFooterGate. */}
      <LandingFooter locale={locale} />
    </div>
  );
}
