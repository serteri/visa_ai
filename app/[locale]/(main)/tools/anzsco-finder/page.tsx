import type { Metadata } from "next";

import { AnzscoSearchTool } from "./AnzscoSearchTool";
import { SeoContentSection } from "@/components/SeoContentSection";
import { getAnzscoSeoContent, buildAnzscoSchema } from "@/lib/seo/anzsco-content";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title: "ANZSCO Code & Duty Finder | LogiVisa",
    description:
      "Search popular Australian occupations by title or code and review typical ANZSCO duties before checking PR eligibility.",
    alternates: {
      canonical: `/${locale}/tools/anzsco-finder`,
      languages: {
        en: "/en/tools/anzsco-finder",
        tr: "/tr/tools/anzsco-finder",
        "zh-Hans": "/zh-Hans/tools/anzsco-finder",
      },
    },
    openGraph: {
      title: "ANZSCO Code & Duty Finder | LogiVisa",
      description:
        "Find ANZSCO codes, skill levels, and typical occupation duties for Australian skilled migration planning.",
      type: "website",
      url: `/${locale}/tools/anzsco-finder`,
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function AnzscoFinderPage({ params }: PageProps) {
  const { locale } = await params;
  const seoContent = getAnzscoSeoContent(locale);
  const schemaJson = buildAnzscoSchema(locale);
  return (
    <>
      <AnzscoSearchTool locale={locale} />
      <SeoContentSection {...seoContent} schemaJson={schemaJson} />
    </>
  );
}
