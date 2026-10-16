import { pageAlternates, publicUrl, SITE_ORIGIN } from "@/lib/seo/urls";
import type { Metadata } from "next";
import { CanadaPointsCalculatorClient } from "../canada-points-calculator-client";

const BASE_URL = SITE_ORIGIN;

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title: "Canada Express Entry CRS Points Calculator 2026",
    description:
      "Calculate your Comprehensive Ranking System (CRS) points score instantly for Canada immigration.",
    alternates: pageAlternates(locale, `/tools/points-calculator/canada`),
    openGraph: {
      title: "Canada Express Entry CRS Points Calculator 2026",
      description:
        "Calculate your Comprehensive Ranking System (CRS) points score instantly for Canada immigration.",
      type: "website",
      url: publicUrl(locale, `/tools/points-calculator/canada`),
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function CanadaPointsCalculatorPage({ params }: PageProps) {
  const { locale } = await params;
  return <CanadaPointsCalculatorClient locale={locale} />;
}
