import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";

import { LanguageProvider } from "@/contexts/language-context";
import { ShellHeaderGate, ShellFooterGate } from "@/components/shell-gates";
import { RefCapture } from "@/components/ref-capture";
import { OutboundLinkTracker } from "@/components/analytics/outbound-link-tracker";
import { ResearchContinuationTracker } from "@/components/analytics/research-continuation-tracker";
import { Toaster } from "@/components/ui/sonner";
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import { getTranslations } from "@/lib/i18n/get-translations";

const SITE_NAME = "LogiVisa";
const BASE_URL = "https://www.logivisa.com";

function getLocaleTitle(locale: string) {
  if (locale === "tr") {
    return "LogiVisa — Avustralya Vize ve Meslek Araştırması";
  }
  if (locale === "zh-Hans") {
    return "LogiVisa — 澳大利亚签证与职业研究";
  }
  return "LogiVisa — Australian Visa & Occupation Research";
}

function getLocaleDescription(locale: string) {
  if (locale === "tr") {
    return "Kaynak bağlantılı araçlarla Avustralya mesleklerini, beceri değerlendirmelerini ve yayımlanmış vize şartlarını araştırın.";
  }
  if (locale === "zh-Hans") {
    return "通过来源链接与工具研究澳大利亚职业、技能评估和已公布的签证要求。";
  }
  return "Research Australian occupations, skills assessments and published visa requirements with source-linked tools, points estimates and visa comparisons.";
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
      <ShellHeaderGate locale={locale} showAdmin={showAdmin} />
      <main className="overflow-x-hidden pt-28 sm:pt-32">{children}</main>
      <ShellFooterGate locale={locale} />
      <Toaster />
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      {gaId ? <OutboundLinkTracker locale={locale} /> : null}
      {gaId ? <ResearchContinuationTracker locale={locale} /> : null}
    </LanguageProvider>
  );
}
