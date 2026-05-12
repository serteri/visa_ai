import type { Metadata } from "next";
import { SkillsAssessmentClient } from "./SkillsAssessmentClient";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title: "Skills Assessment Body Finder | Australian Visa | LogiVisa",
    description:
      "Find out which skills assessing body you need for your Australian visa application. Instant results for 500+ occupations.",
    alternates: {
      canonical: `/${locale}/tools/skills-assessment`,
      languages: {
        en: `/en/tools/skills-assessment`,
        tr: `/tr/tools/skills-assessment`,
        "zh-Hans": `/zh-Hans/tools/skills-assessment`,
      },
    },
    openGraph: {
      title: "Skills Assessment Body Finder | Australian Visa | LogiVisa",
      description:
        "Find out which skills assessing body you need for your Australian visa application. Instant results for 500+ occupations.",
      type: "website",
      url: `/${locale}/tools/skills-assessment`,
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function SkillsAssessmentPage({ params }: PageProps) {
  const { locale } = await params;
  return <SkillsAssessmentClient locale={locale} />;
}
