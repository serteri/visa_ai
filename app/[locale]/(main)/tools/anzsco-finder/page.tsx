import { pageAlternates, publicUrl, SITE_ORIGIN } from "@/lib/seo/urls";
import { ToolUseTracker } from "@/components/analytics/tool-use-tracker";
import type { Metadata } from "next";

import { RichOccupationLinks } from "@/components/occupations/rich-occupation-links";
import { AnzscoSearchTool } from "./AnzscoSearchTool";
import { SeoContentSection } from "@/components/SeoContentSection";
import { getAnzscoSeoContent, buildAnzscoSchema } from "@/lib/seo/anzsco-content";

const BASE_URL = SITE_ORIGIN;

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title: "ANZSCO Code & Duty Finder",
    description:
      "Search Australian occupations by title or code and review typical ANZSCO duties, skill level and published occupation information.",
    alternates: pageAlternates(locale, `/tools/anzsco-finder`),
    openGraph: {
      title: "ANZSCO Code & Duty Finder",
      description:
        "Find ANZSCO codes, skill levels, and typical occupation duties for Australian skilled migration planning.",
      type: "website",
      url: publicUrl(locale, `/tools/anzsco-finder`),
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function AnzscoFinderPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { q } = await searchParams;
  const seoContent = getAnzscoSeoContent(locale);
  const schemaJson = buildAnzscoSchema(locale);
  return (
    <>
      <ToolUseTracker tool="anzsco_finder" locale={locale} />
      <AnzscoSearchTool locale={locale} initialQuery={q} />
      <div className="px-4 pb-8">
        <RichOccupationLinks locale={locale} />
      </div>
      <SeoContentSection {...seoContent} schemaJson={schemaJson} />
    </>
  );
}
