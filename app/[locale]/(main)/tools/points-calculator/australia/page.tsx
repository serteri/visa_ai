import { pageAlternates, publicUrl, SITE_ORIGIN } from "@/lib/seo/urls";
import type { Metadata } from "next";
import { PointsCalculatorClient } from "../points-calculator-client";
import { CalculatorOccupationNote } from "@/components/occupations/calculator-occupation-note";
import { PointsCalculatorHeader, PointsCalculatorSeoSections } from "@/components/points-calculator/points-calculator-seo-sections";
import { getPointsCalcSeoContent } from "@/lib/seo/points-calculator-content";

const BASE_URL = SITE_ORIGIN;

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);
  const { meta } = getPointsCalcSeoContent(locale);

  return {
    metadataBase: siteUrl,
    title: meta.title,
    description: meta.description,
    alternates: pageAlternates(locale, `/tools/points-calculator/australia`),
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: "website",
      url: publicUrl(locale, `/tools/points-calculator/australia`),
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function AustraliaPointsCalculatorPage({ params }: PageProps) {
  const { locale } = await params;
  return (
    <>
      <CalculatorOccupationNote locale={locale} />
      <PointsCalculatorClient locale={locale} header={<PointsCalculatorHeader locale={locale} />} />
      <PointsCalculatorSeoSections locale={locale} />
    </>
  );
}
