import type { Metadata } from "next";

import { DocumentChecklist2026 } from "./DocumentChecklist2026";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);
  const isTr = locale === "tr";

  return {
    metadataBase: siteUrl,
    title: isTr
      ? "Avustralya Vize Belge Kontrol Listesi 2026 | LogiVisa"
      : "Australian Visa Document Checklist 2026 | LogiVisa",
    description: isTr
      ? "Avustralya vize başvurusu için gerekli tüm belgeleri takip edin. Son kullanma tarihi uyarıları, apostil ve NAATI gereksinimleri. 189, 190, 491, 482, 485 vize türleri."
      : "Track all documents needed for your Australian visa application. Expiry date alerts, apostille and NAATI requirements for subclasses 189, 190, 491, 482 and 485.",
    alternates: {
      canonical: `/${locale}/tools/document-checklist-2026`,
      languages: {
        en: "/en/tools/document-checklist-2026",
        tr: "/tr/tools/document-checklist-2026",
        "zh-Hans": "/zh-Hans/tools/document-checklist-2026",
      },
    },
    openGraph: {
      title: "Australian PR Document Checklist 2026 | LogiVisa",
      description:
        "Interactive document checklist for Australian skilled migration 2026. Track your readiness across skills assessment, employment, and points claims.",
      type: "website",
      url: `/${locale}/tools/document-checklist-2026`,
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function DocumentChecklist2026Page({ params }: PageProps) {
  const { locale } = await params;
  return <DocumentChecklist2026 locale={locale} />;
}
