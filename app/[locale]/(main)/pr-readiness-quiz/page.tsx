import type { Metadata } from "next";

import { getTranslations, t as getT } from "@/lib/i18n/get-translations";
import type { Locale } from "@/lib/i18n/config";
import { InteractiveQuiz } from "./InteractiveQuiz";
import { pageAlternates, publicUrl } from "@/lib/seo/urls";

// The production origin, not an environment variable: a missing or malformed NEXT_PUBLIC_BASE_URL must not break metadata or point canonicals at localhost.
const BASE_URL = "https://www.logivisa.com";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);
  const translations = await getTranslations(locale as Locale);
  const tx = (key: string, fallback: string) => getT(translations, key, fallback);

  return {
    metadataBase: siteUrl,
    title: tx(
      "quiz.meta.title",
      "Australian PR Readiness Quiz — Discover Your Hidden PR Score in 2 Minutes",
    ),
    description: tx(
      "quiz.meta.description",
      "Take our 8-question AI quiz to find your Australian PR readiness score, uncover hidden points, and see exactly which visa pathway is most likely to get you invited in 2026.",
    ),
    alternates: pageAlternates(locale, `/pr-readiness-quiz`),
    openGraph: {
      title: tx(
        "quiz.meta.ogTitle",
        "Are You Actually Ready for Australian PR? Take the 2-Minute Quiz",
      ),
      description: tx(
        "quiz.meta.ogDescription",
        "8 questions. Instant AI analysis. Discover your hidden PR points and the exact visa pathway that fits your profile.",
      ),
      type: "website",
      url: publicUrl(locale, `/pr-readiness-quiz`),
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function PrReadinessQuizPage({ params }: PageProps) {
  const { locale } = await params;
  return <InteractiveQuiz locale={locale} />;
}
