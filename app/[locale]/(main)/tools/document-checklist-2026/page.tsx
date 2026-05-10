import type { Metadata } from "next";

import { DocumentChecklist2026 } from "./DocumentChecklist2026";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title: "Australian PR Document Checklist 2026 | LogiVisa",
    description:
      "The complete 2026 checklist for Australian skilled migration documents — skills assessment evidence, employment proof, and points test claims. Free & instant.",
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
