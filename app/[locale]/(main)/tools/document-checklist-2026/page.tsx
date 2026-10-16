import { pageAlternates, publicUrl, SITE_ORIGIN } from "@/lib/seo/urls";
import type { Metadata } from "next";

import { DocumentChecklist2026Localized } from "./DocumentChecklist2026Localized";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale, isValidLocale, type Locale } from "@/lib/i18n/config";

const BASE_URL = SITE_ORIGIN;

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);
  const normalizedLocale = isValidLocale(locale) ? locale : defaultLocale;
  const dictionary = await getDictionary(normalizedLocale);
  const checklist = dictionary.documentChecklist2026;

  return {
    metadataBase: siteUrl,
    title: `${checklist.pageTitle}`,
    description: checklist.pageSubtitle,
    alternates: pageAlternates(locale, `/tools/document-checklist-2026`),
    openGraph: {
      title: "Australian PR Document Checklist 2026",
      description:
        "Interactive document checklist for Australian skilled migration 2026. Track your readiness across skills assessment, employment, and points claims.",
      type: "website",
      url: publicUrl(locale, `/tools/document-checklist-2026`),
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function DocumentChecklist2026Page({ params }: PageProps) {
  const { locale } = await params;
  const normalizedLocale = (isValidLocale(locale) ? locale : defaultLocale) as Locale;

  return <DocumentChecklist2026Localized locale={normalizedLocale} />;
}
