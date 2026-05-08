import type { Metadata } from "next";
import { InteractiveQuiz } from "./InteractiveQuiz";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title: "Australian PR Readiness Quiz — Discover Your Hidden PR Score in 2 Minutes",
    description:
      "Take our 8-question AI quiz to find your Australian PR readiness score, uncover hidden points, and see exactly which visa pathway is most likely to get you invited in 2026.",
    alternates: {
      canonical: `/${locale}/pr-readiness-quiz`,
      languages: {
        en: "/en/pr-readiness-quiz",
        tr: "/tr/pr-readiness-quiz",
        "zh-Hans": "/zh-Hans/pr-readiness-quiz",
      },
    },
    openGraph: {
      title: "Are You Actually Ready for Australian PR? Take the 2-Minute Quiz",
      description:
        "8 questions. Instant AI analysis. Discover your hidden PR points and the exact visa pathway that fits your profile.",
      type: "website",
      url: `/${locale}/pr-readiness-quiz`,
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function PrReadinessQuizPage({ params }: PageProps) {
  const { locale } = await params;
  return <InteractiveQuiz locale={locale} />;
}
