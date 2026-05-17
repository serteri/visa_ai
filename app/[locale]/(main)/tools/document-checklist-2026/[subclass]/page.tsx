import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocumentChecklist2026 } from "../DocumentChecklist2026";
import { defaultLocale, isValidLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";
const VALID_SUBCLASSES = new Set(["189", "190", "491", "482", "485"]);

type PageProps = {
  params: Promise<{ locale: string; subclass: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, subclass } = await params;
  const normalizedLocale = isValidLocale(locale) ? locale : defaultLocale;
  const dictionary = await getDictionary(normalizedLocale);
  const checklist = dictionary.documentChecklist2026;
  const visa = checklist.visas[subclass as keyof typeof checklist.visas];

  if (!VALID_SUBCLASSES.has(subclass) || !visa) {
    return {};
  }

  return {
    metadataBase: new URL(BASE_URL),
    title: `${visa.title} ${checklist.pageTitle} | LogiVisa`,
    description: visa.description,
    alternates: {
      canonical: `/${normalizedLocale}/tools/document-checklist-2026/${subclass}`,
      languages: {
        en: `/en/tools/document-checklist-2026/${subclass}`,
        tr: `/tr/tools/document-checklist-2026/${subclass}`,
        "zh-Hans": `/zh-Hans/tools/document-checklist-2026/${subclass}`,
      },
    },
  };
}

export default async function DocumentChecklist2026SubclassPage({ params }: PageProps) {
  const { locale, subclass } = await params;

  if (!VALID_SUBCLASSES.has(subclass)) {
    notFound();
  }

  const normalizedLocale = (isValidLocale(locale) ? locale : defaultLocale) as Locale;
  const dictionary = await getDictionary(normalizedLocale);

  return (
    <DocumentChecklist2026
      locale={normalizedLocale}
      dictionary={dictionary.documentChecklist2026}
      initialVisa={subclass}
    />
  );
}
