import type { Metadata } from "next";

import { LanguageProvider } from "@/contexts/language-context";
import { getTranslations, t } from "@/lib/i18n/get-translations";
import type { Locale } from "@/lib/i18n/config";
import { PricingPlans } from "./pricing-plans";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const translations = await getTranslations(locale as Locale);

  return {
    title: `${t(translations, "pricing.title", "Premium Credit Packages")} — LogiVisa`,
    description: t(
      translations,
      "pricing.subtitle",
      "Premium AI visa consulting credit packages.",
    ),
  };
}

export default async function PricingPage({ params }: PageProps) {
  const { locale } = await params;
  const translations = await getTranslations(locale as Locale);

  return (
    <LanguageProvider initialLocale={locale as Locale} initialTranslations={translations}>
      <div className="min-h-screen bg-background">
        <header className="mx-auto max-w-4xl px-4 pt-16 pb-10 text-center sm:pt-24">
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            {t(translations, "pricing.title", "Premium Credit Packages")}
          </h1>
          <p className="mt-3 text-sm text-indigo-100 sm:text-base">
            {t(translations, "pricing.subtitle", "Keep using the LogiVisa AI Assistant with a credit package.")}
          </p>
        </header>

        <main className="mx-auto max-w-4xl px-4 pb-20">
          <PricingPlans />
        </main>
      </div>
    </LanguageProvider>
  );
}
