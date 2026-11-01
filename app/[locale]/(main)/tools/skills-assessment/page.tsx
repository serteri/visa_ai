import { RelatedGuidesNote } from "@/components/guides/related-guides-note";
import { ToolUseTracker } from "@/components/analytics/tool-use-tracker";
import { pageAlternates, publicUrl, SITE_ORIGIN } from "@/lib/seo/urls";
import type { Metadata } from "next";
import { SkillsAssessmentClient } from "./SkillsAssessmentClient";
import { SeoContentSection } from "@/components/SeoContentSection";
import { getSkillsAssessmentSeoContent, buildSkillsAssessmentSchema } from "@/lib/seo/skills-assessment-content";
import { researchText } from "@/lib/marketing/research-journey";
import { HOME_AFFAIRS_SOL_URL } from "@/lib/occupations/page-content";

const DEWR_ASSESSING_AUTHORITIES_URL = "https://www.dewr.gov.au/assessing-authority-policy-and-assurance/assessing-authorities";

const BASE_URL = SITE_ORIGIN;

type PageProps = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const title = t("Skills Assessing Authority Finder for Australia", "Avustralya Beceri Değerlendirme Kurumu Bulucu", "澳大利亚技能评估机构查询");
  const description = t(
    "Look up which authority is listed to assess an occupation for Australian skilled migration, with official source links. Coverage is limited; a missing record is not a visa outcome.",
    "Avustralya nitelikli göçü için bir mesleği değerlendirmek üzere listelenen kurumu resmî kaynak bağlantılarıyla bulun. Kapsam sınırlıdır; kaydın olmaması bir vize sonucu değildir.",
    "查询澳大利亚技术移民中某职业所列的评估机构，并附官方来源链接。覆盖范围有限；缺少记录并不代表签证结果。",
  );

  return {
    metadataBase: siteUrl,
    title,
    description,
    alternates: pageAlternates(locale, `/tools/skills-assessment`),
    openGraph: {
      title,
      description,
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
      <ToolUseTracker tool="skills_assessment_finder" locale={locale} />
      <SkillsAssessmentClient key={q ?? ""} locale={locale} initialQuery={q} />
      <SeoContentSection
        {...seoContent}
        schemaJson={schemaJson}
        defaultOpen
        sourcesLabel={researchText(locale, "Official sources", "Resmî kaynaklar", "官方来源")}
        sources={[
          { label: researchText(locale, "DEWR approved assessing authorities", "DEWR onaylı değerlendirme kurumları", "DEWR 认可的评估机构"), url: DEWR_ASSESSING_AUTHORITIES_URL },
          { label: researchText(locale, "Home Affairs skilled occupation lists", "İçişleri Bakanlığı kalifiye meslek listeleri", "内政部技术职业清单"), url: HOME_AFFAIRS_SOL_URL },
        ]}
      />
      <RelatedGuidesNote locale={locale} slugs={["skills-assessment-vs-visa-eligibility", "tra-msa-vs-osap", "engineers-australia-accredited-vs-cdr"]} lead="Related research on how a skills assessment differs from the other steps:" />
    </>
  );
}
