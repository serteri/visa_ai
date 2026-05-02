import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";

import { LanguageProvider } from "@/contexts/language-context";
import { Header } from "@/components/header";
import { GlobalDisclaimerFooter } from "@/components/global-disclaimer-footer";
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import { getTranslations } from "@/lib/i18n/get-translations";

const SITE_NAME = "Logivisa";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

function getLocaleDescription(locale: string) {
  if (locale === "tr") {
    return "Avustralya vize yollari icin yapilandirilmis analiz ve hazirlik raporlari.";
  }
  if (locale === "zh-Hans") {
    return "面向澳大利亚签证路径的结构化分析与准备度报告。";
  }
  return "Structured visa pathway analysis and readiness reports for Australia.";
}

function getOgLocale(locale: string) {
  if (locale === "tr") return "tr_TR";
  if (locale === "zh-Hans") return "zh_CN";
  return "en_AU";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const description = getLocaleDescription(locale);
  const canonicalPath = `/${locale}`;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: "/en",
        tr: "/tr",
        "zh-Hans": "/zh-Hans",
      },
    },
    openGraph: {
      type: "website",
      locale: getOgLocale(locale),
      url: canonicalPath,
      siteName: SITE_NAME,
      title: SITE_NAME,
      description,
      images: [
        {
          url: "/og/default-og.png",
          width: 1200,
          height: 630,
          alt: "Logivisa",
        },
      ],
    },
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
  const showAdmin = process.env.SHOW_ADMIN === "true";
  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();
  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: ["en", "tr", "zh-Hans"],
    url: BASE_URL,
    description: getLocaleDescription(locale),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "AUD",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <LanguageProvider initialLocale={locale as Locale} initialTranslations={translations}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <Header locale={locale} showAdmin={showAdmin} />
      {children}
      <GlobalDisclaimerFooter />
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </LanguageProvider>
  );
}
