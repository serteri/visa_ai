import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";

import { LanguageProvider } from "@/contexts/language-context";
import { Header } from "@/components/header";
import { GlobalDisclaimerFooter } from "@/components/global-disclaimer-footer";
import { PreFooterCta } from "@/components/pre-footer-cta";
import { RefCapture } from "@/components/ref-capture";
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import { getTranslations } from "@/lib/i18n/get-translations";

const SITE_NAME = "LogiVisa";
const BASE_URL = "https://www.logivisa.com";

function getLocaleTitle(locale: string) {
  if (locale === "tr") {
    return "LogiVisa — Avustralya Skilled Migration ve PR Rehberi";
  }
  if (locale === "zh-Hans") {
    return "LogiVisa — 澳大利亚技术移民与永居指南";
  }
  return "LogiVisa — Australia Skilled Migration & PR Guide";
}

function getLocaleDescription(locale: string) {
  if (locale === "tr") {
    return "Avustralya Skilled Migration (189/190/491) icin ucretsiz puan hesaplayici, ANZSCO kod bulucu ve hazirlik raporlari. Turkce ve Global Ingilizce PDF PR rehberleri $9.99'dan basliyor.";
  }
  if (locale === "zh-Hans") {
    return "免费的澳大利亚技术移民（189/190/491）积分计算器、ANZSCO 职业代码查找工具和准备度报告。土耳其语和全球英语 PDF 永居指南起价 $9.99。";
  }
  return "Free Australia Skilled Migration (189/190/491) points calculator, ANZSCO finder, and readiness reports. Turkish and Global English PDF PR guides from $9.99.";
}

function getOgLocale(locale: string) {
  if (locale === "tr") return "tr_TR";
  if (locale === "zh-Hans") return "zh_CN";
  return "en_AU";
}

// English is served prefixless (proxy.ts redirects /en -> / and rewrites
// / -> /en internally) — /tr and /zh-Hans keep their locale prefix. Every
// canonical/hreflang/OG URL must reflect the REAL public URL, not the
// internal route path, or Google indexes a URL that just redirects away.
function getPublicPath(locale: string): string {
  return locale === "en" ? "/" : `/${locale}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title = getLocaleTitle(locale);
  const description = getLocaleDescription(locale);
  const siteUrl = new URL(BASE_URL);
  const canonicalPath = getPublicPath(locale);

  return {
    metadataBase: siteUrl,
    title: {
      default: title,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    keywords: [
      "Australia skilled migration",
      "Australia PR points calculator",
      "Subclass 189",
      "Subclass 190",
      "Subclass 491",
      "Australia student visa",
      "Subclass 500",
      "ANZSCO code finder",
    ],
    alternates: {
      // Relative canonical keeps the current path and drops query params like
      // ?dpl=. It correctly resolves to "/" for English (rewritten, URL bar
      // stays at "/") and "/tr/" or "/zh-Hans/" for the other locales.
      canonical: "./",
      languages: {
        en: BASE_URL,
        tr: `${BASE_URL}/tr`,
        "zh-Hans": `${BASE_URL}/zh-Hans`,
        "x-default": BASE_URL,
      },
    },
    openGraph: {
      type: "website",
      locale: getOgLocale(locale),
      url: canonicalPath,
      siteName: SITE_NAME,
      title,
      description,
      images: [
        {
          url: "/og/default-og.png",
          width: 1200,
          height: 630,
          alt: SITE_NAME,
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
      <Suspense fallback={null}>
        <RefCapture />
      </Suspense>
      <Header locale={locale} showAdmin={showAdmin} />
      <main className="overflow-x-hidden pt-28 sm:pt-32">{children}</main>
      <PreFooterCta locale={locale} />
      <GlobalDisclaimerFooter />
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </LanguageProvider>
  );
}
