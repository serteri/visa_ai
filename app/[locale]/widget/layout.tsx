import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { LanguageProvider } from "@/contexts/language-context";
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import { getTranslations } from "@/lib/i18n/get-translations";

// The widget sits outside the (main) group, so it does not get that layout's LanguageProvider. The shared calculator reads its text through
// useTranslation(), which throws without the provider (HTTP 500). The provider is supplied here, with no site header, footer or other chrome.
export default async function WidgetLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const translations = await getTranslations(locale as Locale);

  return (
    <LanguageProvider initialLocale={locale as Locale} initialTranslations={translations}>
      <div className="bg-transparent min-h-screen">{children}</div>
    </LanguageProvider>
  );
}
