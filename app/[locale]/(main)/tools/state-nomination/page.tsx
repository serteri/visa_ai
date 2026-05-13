import type { Metadata } from "next";
import { StateNominationClient } from "./StateNominationClient";
import { SeoContentSection } from "@/components/SeoContentSection";
import { getStateNominationSeoContent, buildStateNominationSchema } from "@/lib/seo/state-nomination-content";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title: "State Nomination Finder | Australia 190 & 491 Visa | LogiVisa",
    description:
      "Compare all 8 Australian states for skilled nomination. Find which states match your occupation and points score.",
    alternates: {
      canonical: `/${locale}/tools/state-nomination`,
      languages: {
        en: `/en/tools/state-nomination`,
        tr: `/tr/tools/state-nomination`,
        "zh-Hans": `/zh-Hans/tools/state-nomination`,
      },
    },
    openGraph: {
      title: "State Nomination Finder | Australia 190 & 491 Visa | LogiVisa",
      description:
        "Compare all 8 Australian states for skilled nomination. Find which states match your occupation and points score.",
      type: "website",
      url: `/${locale}/tools/state-nomination`,
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function StateNominationPage({ params }: PageProps) {
  const { locale } = await params;
  const seoContent = getStateNominationSeoContent(locale);
  const schemaJson = buildStateNominationSchema(locale);
  return (
    <>
      <StateNominationClient locale={locale} />
      <SeoContentSection {...seoContent} schemaJson={schemaJson} />
    </>
  );
}
