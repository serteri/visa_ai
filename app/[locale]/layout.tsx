import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { LanguageProvider } from "@/contexts/language-context";
import { Header } from "@/components/header";
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import { getTranslations } from "@/lib/i18n/get-translations";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === "tr";

  return {
    title: "Logivisa",
    description: isTr
      ? "Avustralya vize yollari icin yapilandirilmis analiz ve hazirlik raporlari."
      : "Structured visa pathway analysis and readiness reports for Australia.",
  };
}

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const translations = await getTranslations(locale as Locale);

  return (
    <LanguageProvider initialLocale={locale as Locale} initialTranslations={translations}>
      <Header />
      {children}
    </LanguageProvider>
  );
}
