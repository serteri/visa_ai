import { pageAlternates, publicUrl, SITE_ORIGIN } from "@/lib/seo/urls";
import type { Metadata } from "next";
import { StateNominationClient } from "./StateNominationClient";
import { SeoContentSection } from "@/components/SeoContentSection";
import { getStateNominationSeoContent, buildStateNominationSchema } from "@/lib/seo/state-nomination-content";

const BASE_URL = SITE_ORIGIN;

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title: "State Nomination References | Australia 190 & 491",
    description:
      "Explore dated state and territory occupation-list references and official criteria. Historical list data does not predict nomination.",
    alternates: pageAlternates(locale, `/tools/state-nomination`),
    openGraph: {
      title: "State Nomination References | Australia 190 & 491",
      description:
        "Explore dated state and territory occupation-list references and official criteria. Historical list data does not predict nomination.",
      type: "website",
      url: publicUrl(locale, `/tools/state-nomination`),
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
