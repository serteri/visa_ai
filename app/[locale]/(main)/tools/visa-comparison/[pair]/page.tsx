import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { PairComparisonView } from "@/components/visas/pair-comparison-view";
import { activeLocales, isValidLocale } from "@/lib/i18n/config";
import { pageAlternates, publicUrl } from "@/lib/seo/urls";
import { isPairSlug, PAIRS, pairContent } from "@/lib/visas/pair-comparison";

type PageProps = { params: Promise<{ locale: string; pair: string }> };

export function generateStaticParams() {
  return activeLocales.flatMap((locale) => PAIRS.map((p) => ({ locale, pair: p.slug })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, pair } = await params;
  if (!isValidLocale(locale) || !isPairSlug(pair)) return { robots: { index: false, follow: false } };
  const c = pairContent(pair, locale);
  const path = `/tools/visa-comparison/${pair}`;
  return {
    title: c.title,
    description: c.description,
    alternates: pageAlternates(locale, path),
    openGraph: { title: c.title, description: c.description, type: "website", url: publicUrl(locale, path), images: [{ url: "/og/default-og.png", width: 1200, height: 630 }] },
  };
}

export default async function VisaPairPage({ params }: PageProps) {
  const { locale, pair } = await params;
  if (!isValidLocale(locale) || !isPairSlug(pair)) notFound();
  return (
    <>
      <PageViewTracker event="comparison_page_view" params={{ locale, page_type: "visa_comparison" }} />
      <PairComparisonView slug={pair} locale={locale} />
    </>
  );
}
