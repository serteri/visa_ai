import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { LanguageProvider } from "@/contexts/language-context";
import { Header } from "@/components/header";
import { isValidLocale, type Locale } from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: "Visa Pathway Checker",
  description:
    "Understand your possible Australian visa pathways before speaking with a registered migration agent.",
};

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

  return (
    <LanguageProvider initialLocale={locale as Locale}>
      <Header />
      {children}
    </LanguageProvider>
  );
}
