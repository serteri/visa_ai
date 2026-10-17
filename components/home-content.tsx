"use client";
import { useParams } from "next/navigation";
import { Hero } from "@/components/landing/Hero";
import { StatsBar } from "@/components/landing/StatsBar";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Faq } from "@/components/landing/Faq";
import { LandingFooter } from "@/components/landing/footer";
import { AssessmentSection } from "@/components/landing/AssessmentSection";
export function HomeContent() {
  const { locale } = useParams<{ locale: string }>();
  return (
    <div className="case-file">
      <Hero locale={locale} />
      <StatsBar locale={locale} />
      <HowItWorks locale={locale} />
      <AssessmentSection locale={locale} />
      <Faq locale={locale} />
      <LandingFooter locale={locale} />
    </div>
  );
}
