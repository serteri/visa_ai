import type { Metadata } from "next";
import { CanadaPointsCalculatorClient } from "../canada-points-calculator-client";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title: "Canada Express Entry CRS Points Calculator 2026 | LogiVisa",
    description:
      "Calculate your Comprehensive Ranking System (CRS) points score instantly for Canada immigration.",
    alternates: {
      canonical: `/${locale}/tools/points-calculator/canada`,
      languages: {
        en: `/en/tools/points-calculator/canada`,
        tr: `/tr/tools/points-calculator/canada`,
        "zh-Hans": `/zh-Hans/tools/points-calculator/canada`,
      },
    },
    openGraph: {
      title: "Canada Express Entry CRS Points Calculator 2026 | LogiVisa",
      description:
        "Calculate your Comprehensive Ranking System (CRS) points score instantly for Canada immigration.",
      type: "website",
      url: `/${locale}/tools/points-calculator/canada`,
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function CanadaPointsCalculatorPage({ params }: PageProps) {
  const { locale } = await params;
  return <CanadaPointsCalculatorClient locale={locale} />;
}
