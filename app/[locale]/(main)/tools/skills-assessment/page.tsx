import { RelatedGuidesNote } from "@/components/guides/related-guides-note";
import { pageAlternates, publicUrl, SITE_ORIGIN } from "@/lib/seo/urls";
import type { Metadata } from "next";
import { SkillsAssessmentClient } from "./SkillsAssessmentClient";
import { SeoContentSection } from "@/components/SeoContentSection";
import { getSkillsAssessmentSeoContent, buildSkillsAssessmentSchema } from "@/lib/seo/skills-assessment-content";

const BASE_URL = SITE_ORIGIN;

type PageProps = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title: "Skills Assessment Body Finder | Australian Visa",
    description:
      "Explore available occupation-to-authority references and official assessment sources. Coverage is limited; missing data is not a visa outcome.",
    alternates: pageAlternates(locale, `/tools/skills-assessment`),
    openGraph: {
      title: "Skills Assessment Body Finder | Australian Visa",
      description:
        "Explore available occupation-to-authority references and official assessment sources. Coverage is limited; missing data is not a visa outcome.",
      type: "website",
      url: publicUrl(locale, `/tools/skills-assessment`),
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function SkillsAssessmentPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { q } = await searchParams;
  const seoContent = getSkillsAssessmentSeoContent(locale);
  const schemaJson = buildSkillsAssessmentSchema(locale);
  return (
    <>
      <SkillsAssessmentClient key={q ?? ""} locale={locale} initialQuery={q} />
      <SeoContentSection {...seoContent} schemaJson={schemaJson} />
      <RelatedGuidesNote locale={locale} slugs={["skills-assessment-vs-visa-eligibility", "tra-msa-vs-osap", "engineers-australia-accredited-vs-cdr"]} lead="Related research on how a skills assessment differs from the other steps:" />
    </>
  );
}
