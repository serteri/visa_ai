import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SampleReportIntro } from "@/components/landing/SampleReportSection";
import { PremiumReportShowcase } from "@/components/sections/PremiumReportShowcase";
import { activeLocales, isValidLocale } from "@/lib/i18n/config";

type PageProps = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return activeLocales.map((locale) => ({ locale }));
}

// A product preview, not search content: the real report pages (synthetic profile), kept out of the index and out of the sitemap on purpose.
export const metadata: Metadata = { title: "Sample Assessment Report", robots: { index: false, follow: true }, referrer: "no-referrer" };

export default async function SampleReportPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  return (
    <main className="case-file min-h-screen bg-[var(--cf-bg)] pb-16 pt-28">
      <div className="section-shell mx-auto max-w-3xl">
        <PremiumReportShowcase mode="sequence" intro={<SampleReportIntro locale={locale} sequence />} />
      </div>
    </main>
  );
}
