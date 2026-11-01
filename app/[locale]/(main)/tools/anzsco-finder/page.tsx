import { pageAlternates, publicUrl, SITE_ORIGIN } from "@/lib/seo/urls";
import { ToolUseTracker } from "@/components/analytics/tool-use-tracker";
import type { Metadata } from "next";

import { RichOccupationLinks } from "@/components/occupations/rich-occupation-links";
import { AnzscoSearchTool } from "./AnzscoSearchTool";
import { SeoContentSection } from "@/components/SeoContentSection";
import { getAnzscoSeoContent, buildAnzscoSchema } from "@/lib/seo/anzsco-content";
import { researchText } from "@/lib/marketing/research-journey";
import { ABS_ANZSCO_URL } from "@/lib/occupations/facts";
import { HOME_AFFAIRS_SOL_URL } from "@/lib/occupations/page-content";

const BASE_URL = SITE_ORIGIN;

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const title = t("ANZSCO Code Finder: Search Australian Occupations", "ANZSCO Kod Bulucu: Avustralya Mesleklerini Arayın", "ANZSCO 职业代码查询：搜索澳大利亚职业");
  const description = t(
    "Search Australian occupations by title or ANZSCO code to see the code, skill level, typical duties and published list placement. General information; the ABS and Home Affairs are the official sources.",
    "Avustralya mesleklerini unvan veya ANZSCO koduyla arayın; kodu, beceri düzeyini, tipik görevleri ve yayımlanmış liste yerini görün. Genel bilgidir; resmî kaynaklar ABS ve İçişleri Bakanlığı'dır.",
    "按职业名称或 ANZSCO 代码搜索澳大利亚职业，查看代码、技能等级、典型职责和已公布的清单归属。仅为一般信息；官方来源为 ABS 和澳大利亚内政部。",
  );

  return {
    metadataBase: siteUrl,
    title,
    description,
    alternates: pageAlternates(locale, `/tools/anzsco-finder`),
    openGraph: {
      title,
      description,
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
      <SeoContentSection
        {...seoContent}
        schemaJson={schemaJson}
        defaultOpen
        sourcesLabel={researchText(locale, "Official sources", "Resmî kaynaklar", "官方来源")}
        sources={[
          { label: researchText(locale, "ABS ANZSCO", "ABS ANZSCO", "ABS ANZSCO"), url: ABS_ANZSCO_URL },
          { label: researchText(locale, "Home Affairs skilled occupation lists", "İçişleri Bakanlığı kalifiye meslek listeleri", "内政部技术职业清单"), url: HOME_AFFAIRS_SOL_URL },
        ]}
      />
    </>
  );
}
