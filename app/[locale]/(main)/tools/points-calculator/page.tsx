import type { Metadata } from "next";
import { PointsCalculatorClient } from "./points-calculator-client";
import { SeoContentSection } from "@/components/SeoContentSection";
import { getPointsCalcSeoContent, buildPointsCalcSchema } from "@/lib/seo/points-calculator-content";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title: "Australia Visa Points Calculator 2026 | LogiVisa",
    description:
      "Calculate your 189, 190, and 491 visa points instantly based on 2026 DHA data.",
    alternates: {
      canonical: `/${locale}/tools/points-calculator`,
      languages: {
        en: `/en/tools/points-calculator`,
        tr: `/tr/tools/points-calculator`,
        "zh-Hans": `/zh-Hans/tools/points-calculator`,
      },
    },
    openGraph: {
      title: "Australia Visa Points Calculator 2026 | LogiVisa",
      description:
        "Calculate your 189, 190, and 491 visa points instantly based on 2026 DHA data.",
      type: "website",
      url: `/${locale}/tools/points-calculator`,
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function PointsCalculatorPage({ params }: PageProps) {
  const { locale } = await params;
  const seoContent = getPointsCalcSeoContent(locale);
  const schemaJson = buildPointsCalcSchema(locale);
  return (
    <>
      <PointsCalculatorClient locale={locale} />
      <SeoContentSection {...seoContent} schemaJson={schemaJson} />
    </>
  );
}
