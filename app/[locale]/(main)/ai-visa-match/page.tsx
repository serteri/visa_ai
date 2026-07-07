import type { Metadata } from "next";

import { AnzscoClassifier } from "@/components/AnzscoClassifier";
import { defaultLocale, isValidLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

type AiVisaMatchPageProps = {
  params: Promise<{ locale: string }>;
};

function resolveLocale(locale: string): Locale {
  return isValidLocale(locale) ? locale : defaultLocale;
}

export async function generateMetadata({ params }: AiVisaMatchPageProps): Promise<Metadata> {
  const { locale } = await params;
  const dictionary = await getDictionary(resolveLocale(locale));

  return {
    title: (dictionary["aiVisaMatch.title"] as string) ?? "AI Visa Pathway Matcher",
    description:
      (dictionary["aiVisaMatch.description"] as string) ??
      "Instantly match your CV to an official ANZSCO occupation code with AI. Discover your Australia Skilled Migration (Subclass 189/190/491) pathway in seconds.",
  };
}

export default async function AiVisaMatchPage({ params }: AiVisaMatchPageProps) {
  const { locale } = await params;
  const dictionary = await getDictionary(resolveLocale(locale));
  const title =
    (dictionary["aiVisaMatch.title"] as string) ??
    "Find Your Australia Visa Pathway in Seconds";
  const description =
    (dictionary["aiVisaMatch.description"] as string) ??
    "Upload your CV and our AI instantly analyzes it against all 707 official ANZSCO occupation codes — no forms, no guesswork, just your matching Skilled Migration pathway.";

  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <section className="section-shell pb-6 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
          {title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
          {description}
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-24 pt-4 sm:px-6">
        <AnzscoClassifier initialLocale={locale} />
      </section>
    </div>
  );
}
