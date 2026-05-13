import type { Metadata } from "next";
import { EnglishPointsClient } from "./EnglishPointsClient";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title: "English Test Points Calculator | IELTS PTE TOEFL | LogiVisa",
    description:
      "Calculate how many Australian visa points your English test score is worth. Covers IELTS, PTE Academic, TOEFL iBT and OET instantly.",
    alternates: {
      canonical: `/${locale}/tools/english-points`,
      languages: {
        en: `/en/tools/english-points`,
        tr: `/tr/tools/english-points`,
        "zh-Hans": `/zh-Hans/tools/english-points`,
      },
    },
    openGraph: {
      title: "English Test Points Calculator | IELTS PTE TOEFL | LogiVisa",
      description:
        "Calculate how many Australian visa points your English test score is worth. Covers IELTS, PTE Academic, TOEFL iBT and OET instantly.",
      type: "website",
      url: `/${locale}/tools/english-points`,
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function EnglishPointsPage({ params }: PageProps) {
  const { locale } = await params;
  return <EnglishPointsClient locale={locale} />;
}
