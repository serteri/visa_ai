import { pageAlternates, publicUrl, SITE_ORIGIN } from "@/lib/seo/urls";
import type { Metadata } from "next";
import { EnglishPointsClient } from "./EnglishPointsClient";

const BASE_URL = SITE_ORIGIN;

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title: "English Test Points Calculator | IELTS PTE TOEFL",
    description:
      "Calculate how many Australian visa points your English test score is worth. Covers IELTS, PTE Academic, TOEFL iBT and OET instantly.",
    alternates: pageAlternates(locale, `/tools/english-points`),
    openGraph: {
      title: "English Test Points Calculator | IELTS PTE TOEFL",
      description:
        "Calculate how many Australian visa points your English test score is worth. Covers IELTS, PTE Academic, TOEFL iBT and OET instantly.",
      type: "website",
      url: publicUrl(locale, `/tools/english-points`),
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function EnglishPointsPage({ params }: PageProps) {
  const { locale } = await params;
  return <EnglishPointsClient locale={locale} />;
}
