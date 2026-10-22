import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SampleReportIntro } from "@/components/landing/SampleReportSection";
import { PremiumReportShowcase } from "@/components/sections/PremiumReportShowcase";
import { activeLocales, isValidLocale } from "@/lib/i18n/config";
import { publicUrl } from "@/lib/seo/urls";

type PageProps = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return activeLocales.map((locale) => ({ locale }));
}

// A product preview, not search content: the real report pages (synthetic profile), kept out of the index and out of the sitemap on purpose.
// Intentionally not indexable (unchanged). The canonical is the page's own public URL: English is prefixless, never the internal /en/ route.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return { title: "Sample Assessment Report", robots: { index: false, follow: true }, referrer: "no-referrer", alternates: { canonical: publicUrl(locale, "/sample-report") } };
}

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
